/** Native tools bind one persistent task through its fixed host socket. */
import { isBoundContext } from "./config.mjs";
import { requestSocket } from "./socket-client.mjs";
import { createHash } from "node:crypto";

const MAX_CONTENT = 256 * 1024;

function exactKeys(value, keys) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key));
}

function identifierSchema(ids, description) {
  return { type: "string", minLength: 1, maxLength: 128, description,
    ...(ids.length ? { enum: [...ids] } : {}) };
}

function resultMessage(operation, result) {
  if (result.allowed === null) return operation === "send"
    ? "权限服务没有返回可核对的结果；发送是否发生不能据此确定。"
    : "权限服务没有返回可核对的结果，此次请求未得到确认。";
  if (result.allowed === false) {
    if (typeof result.message === "string") return "元星木已拦下这次请求：" + result.message;
    if (result.reason === "task_revoked") return "资料读取和发送权限已被收回，此次请求被拒绝。本地运算不受这个撤销操作控制。";
    if (result.reason === "destination_cannot_receive_labels") return "这个接收位置没有获准接收工作资料，本次发送已拦下。可以改发给获准接收内部资料的位置。请用日常中文向用户说明。";
    return "请求未获准。原因：" + result.reason;
  }
  if (operation === "send") {
    return result.outcome === "acknowledged"
      ? "获准接收位置返回成功确认。"
      : "请求已获准，但没有收到成功确认；不能据此判断接收方是否已收到内容。";
  }
  if (operation === "draft_email") {
    if (result.status === "pending") return "草稿已交给元星木工作台。请用户核对收件人、主题和全文后亲自确认发送；现在尚未发送邮件。";
    if (result.status === "acknowledged") return "这封邮件此前已经提交，邮箱服务已接收。此次没有重复发送；这不代表收件人已经收到或阅读。";
    if (result.status === "unconfirmed" || result.status === "sending") return "这封邮件已有发送记录，但结果尚未确认。请用户先核对工作台和邮箱，不要重复起草或发送。";
    if (result.status === "cancelled") return "这份草稿已经弃用，没有重新创建或发送。";
    return "这份草稿已有处理记录，没有重新创建或发送。请用户在工作台核对实际状态。";
  }
  if (operation === "propose_action") {
    if (result.status === "pending") return "操作已交给元星木工作台等待本人核对。消息、文件、表单和改动现在尚未提交；请用户打开工作台的待确认操作。";
    if (result.status === "acknowledged") return "这项操作此前已经执行并收到成功确认，此次没有重复执行。请用户在工作台查看实际结果。";
    if (result.status === "unconfirmed" || result.status === "sending") return "这项操作已有执行记录，但结果尚未确认。请先核对工作台和实际接收位置，不要重复提交。";
    if (result.status === "cancelled") return "这项操作已经取消，此次没有重新创建或执行。";
    return "这项操作已有处理记录，此次没有重新创建或执行。请用户在工作台核对实际状态。";
  }
  if (operation === "request_action") {
    if (result.reason === "automatic_prior_outcome_unconfirmed") return "相同操作已有未确认的执行结果，本次没有自动重发。请先核对实际接收位置；其他已授权工作可以继续。";
    if (result.status === "acknowledged") return result.started
      ? "操作已按本次工作预先授权的范围自动执行，接收位置返回成功确认，无需再次确认。"
      : "这项操作已有成功执行记录，此次没有重复执行。";
    if (result.status === "pending") return "这项操作未自动执行，已保留在工作台等待核对。其他已授权工作可以继续。";
    if (result.status === "unconfirmed" || result.status === "executing") return "已有执行尝试，但未确认结果。不会自动重发，请先核对实际接收位置。";
    if (result.status === "cancelled") return "这项操作已取消，没有重新创建或执行。";
    return "请根据以下实际操作记录说明结果，不要自行重新提交。";
  }
  if (operation === "action_targets") return "以下是用户登记的可选操作对象。只能使用这些名称；不能自己添加地址或路径。";
  return operation === "read" ? "权限服务已返回资料。" : "以下为当前任务的实际权限状态。";
}

function toolResult(operation, result) {
  return { content: [{ type: "text", text: resultMessage(operation, result) + "\n" + JSON.stringify(result) }], details: result };
}

function payloadFor(operation, args, config, requestKey) {
  if (operation === "action_targets") return config.reviewedActions && exactKeys(args, []) ? {op:"action_targets"} : null;
  if (operation === "propose_action" || operation === "request_action") return config.reviewedActions
    && (operation !== "request_action" || config.automaticActions) && exactKeys(args, ["kind", "target_id", "payload"])
    && (operation !== "request_action" || ["message", "upload", "form"].includes(args.kind))
    && typeof args.kind === "string" && typeof args.target_id === "string" && args.payload !== null && typeof args.payload === "object" && !Array.isArray(args.payload)
    ? {op:operation, request_key:requestKey, proposal:args} : null;
  if (operation === "describe") return exactKeys(args, []) ? { op: "describe" } : null;
  if (operation === "read") {
    return exactKeys(args, ["resource"]) && typeof args.resource === "string" && config.resourceIds.includes(args.resource)
      ? { op: "read", resource: args.resource } : null;
  }
  if (operation === "draft_email") {
    return config.reviewedMail && exactKeys(args, ["recipient", "subject", "body"])
      && [args.recipient, args.subject, args.body].every(value => typeof value === "string")
      && args.recipient.length <= 254 && args.subject.length <= 400 && Buffer.byteLength(args.body, "utf8") <= 64 * 1024
      ? { op: "draft_email", request_key: requestKey, draft: args } : null;
  }
  return exactKeys(args, ["destination", "body"]) && typeof args.destination === "string"
    && config.destinationIds.includes(args.destination) && typeof args.body === "string"
    && Buffer.byteLength(args.body, "utf8") <= MAX_CONTENT
    ? { op: "send", destination: args.destination, body: args.body } : null;
}

export function registerBrokerTools(api, config) {
  const declarations = [
    { name: "yuanxingmu_read", operation: "read", label: "读取获准资料",
      description: "通过权限服务读取操作者配置的资料。参数只能使用获准资料名称，不能提供文件路径。内容会交给此配置选定的模型处理。",
      parameters: { type: "object", additionalProperties: false, required: ["resource"],
        properties: { resource: identifierSchema(config.resourceIds, "操作者配置的资料名称") } },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } },
    { name: "yuanxingmu_send", operation: "send", label: "发送到获准位置",
      description: "请求权限服务将内容发送到操作者配置的固定接收位置。不能提供网址、收件地址或权限标签；是否可以发送由当前任务权限决定。",
      parameters: { type: "object", additionalProperties: false, required: ["destination", "body"],
        properties: { destination: identifierSchema(config.destinationIds, "操作者配置的接收位置名称"),
          body: { type: "string", maxLength: MAX_CONTENT, description: "要发送的正文，UTF-8 编码后不超过 256 KiB" } } },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } },
    { name: "yuanxingmu_status", operation: "describe", label: "查看资料权限",
      description: "查看这个配置绑定任务的实际资料权限。新建聊天和重新连接不会清除已经累积的限制。",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } },
  ];
  if (config.reviewedMail) declarations.push({ name: "yuanxingmu_prepare_email", operation: "draft_email", label: "起草待核对邮件",
    description: "将一封纯文本邮件交给元星木工作台供用户核对。此工具不会发送邮件；必须由用户在工作台亲自确认。不能传入发件账户、密码、批准标记或额外收件人。",
    parameters: { type: "object", additionalProperties: false, required: ["recipient", "subject", "body"], properties: {
      recipient: {type:"string", maxLength:254, description:"一个明确的收件邮箱，不含姓名、抄送或列表"},
      subject: {type:"string", maxLength:200, description:"邮件主题"},
      body: {type:"string", maxLength:65536, description:"等待用户核对的完整纯文本正文"}
    } },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false } });
  if (config.reviewedActions) declarations.push(
    {name:"yuanxingmu_action_targets", operation:"action_targets", label:"查看可选操作对象",
      description:"查看用户登记的消息接收位置、上传入口、表单和可修改文件。此工具不会发送或修改内容。",
      parameters:{type:"object", properties:{}, additionalProperties:false},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }},
    {name:"yuanxingmu_prepare_action", operation:"propose_action", label:"提交待本人确认的操作",
      description:"先用 yuanxingmu_action_targets 获取对象名称，再提交消息、文本文件上传、表单、文件覆盖或删除的提案。不会实际执行，用户须到元星木工作台核对并确认。message payload为{body}，upload为{filename,content}，form为{fields:{已登记字段:文本}}，overwrite为{content}，delete为{}。",
      parameters:{type:"object", additionalProperties:false, required:["kind","target_id","payload"], properties:{
        kind:{type:"string",enum:["message","upload","form","overwrite","delete"]},
        target_id:{type:"string",minLength:1,maxLength:128},
        payload:{type:"object",properties:{body:{type:"string"},filename:{type:"string"},content:{type:"string"},
          fields:{type:"object",additionalProperties:{type:"string"}}},additionalProperties:false}}},
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }}
  );
  if (config.automaticActions) declarations.push(
    {name:"yuanxingmu_request_action", operation:"request_action", label:"执行已授权操作",
      description:"先用 yuanxingmu_action_targets 查看可用对象和本次自动执行范围。请求提交消息、文本上传或表单；在预先授权范围内通过检查后会立即执行，无需再请用户批准。超范围则保留待确认，不会执行。message payload为{body}，upload为{filename,content}，form为{fields:{已登记字段:文本}}。结果未知时不要换请求重复提交。",
      parameters:{type:"object",additionalProperties:false,required:["kind","target_id","payload"],properties:{
        kind:{type:"string",enum:["message","upload","form"]},target_id:{type:"string",minLength:1,maxLength:128},
        payload:{type:"object",properties:{body:{type:"string"},filename:{type:"string"},content:{type:"string"},
          fields:{type:"object",additionalProperties:{type:"string"}}},additionalProperties:false}}},
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }}
  );
  for (const declaration of declarations) {
    const { operation, ...descriptor } = declaration;
    api.registerTool((context) => {
      if (!isBoundContext(context, config)) return null;
      return { ...descriptor,
        async execute(_toolCallId, args, signal) {
          if (!isBoundContext(context, config)) {
            return toolResult(operation, { allowed: false, reason: "unbound_tool_context" });
          }
          const proposal = operation === "draft_email" || operation === "propose_action" || operation === "request_action";
          if (proposal && (typeof _toolCallId !== "string" || !_toolCallId || _toolCallId.length > 1024)) {
            return toolResult(operation, {allowed:false, reason:"invalid_tool_call_id"});
          }
          const requestKey = proposal ? createHash("sha256").update(context.sessionKey + "\0" + _toolCallId).digest("hex") : null;
          const payload = payloadFor(operation, args, config, requestKey);
          if (!payload) return toolResult(operation, { allowed: false, reason: "invalid_tool_arguments" });
          if (signal?.aborted) return toolResult(operation, { allowed: false, reason: "cancelled_before_request" });
          try {
            const result = await requestSocket(config.brokerSocket, payload, { signal, timeoutMs: config.defenseEnabled ? 60000 : 15000 });
            if (typeof result.allowed !== "boolean") throw new Error("invalid_broker_response");
            return toolResult(operation, result);
          } catch {
            // A transport failure after dispatch does not prove non-delivery.
            return toolResult(operation, { allowed: null, reason: "broker_response_unavailable", outcome: "unknown" });
          }
        },
      };
    }, { name: declaration.name, optional: true });
  }
}
