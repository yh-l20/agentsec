# Agent Defense Check

**Check how your agent's tools are protected, prepare a concrete configuration change, and verify what reached the receiving service.**

[中文说明](README.zh-CN.md) · [Verification evidence](docs/verification.md)

This early prototype addresses one narrow integration problem: a tool reads private data through one gateway connection, then another tool sends it through a different connection. If the rule service only checks each connection's history, it cannot connect the read to the send.

The candidate keeps the two original services. An existing FastMCP aggregator exposes them through one unchanged Invariant Gateway connection, and the tool regenerates one supported rule for the resulting tool names.

```text
Before                               Candidate
client → gateway → reading service    client → gateway → FastMCP → reading service
client → gateway → sending service                              → sending service
          separate histories                     one guarded history
```

In the Windows and Ubuntu/WSL examples, three prohibited sends reached the receiving service before the change and none afterward. Two internal corrections and a separate public send still arrived. These are results from **real third-party runtimes with synthetic services and data**; [the evidence and its scope](docs/verification.md) are explicit.

The [LangChain 1.4.0 example](examples/langchain/README.md) also runs actual framework tools. It reproduces a private send after an application closes its client and reuses an old tool, then makes those tool references expire with their task. Normal corrections still work inside the task. The framework's default stdio keep-alive path already passed the tested protection checks.

## Try the demo on Windows

The full demo has been exercised on Windows with Python 3.12, including paths containing spaces and Chinese characters. Start in this repository with `python` pointing to Python 3.12. Two environments separate the gateway's older dependencies from the aggregator's dependencies.

```powershell
python -m venv .venv-gateway
& .\.venv-gateway\Scripts\python.exe -m pip install -r requirements-gateway.txt .

python -m venv .venv-aggregation
& .\.venv-aggregation\Scripts\python.exe -m pip install -r requirements-aggregation.txt

$gatewayPython = (Resolve-Path .\.venv-gateway\Scripts\python.exe).Path
$aggregationPython = (Resolve-Path .\.venv-aggregation\Scripts\python.exe).Path
& $gatewayPython -m defensecheck demo --gateway-python $gatewayPython --aggregation-python $aggregationPython --output .\output\first-run
```

Choose a fresh output directory. The demo writes the original configuration, candidate files, RPC records, policy evaluations, downstream receipts, process observations, and `results.json`. It uses an authenticated local rule adapter and two separate test services. There is no model, real email account, or production service involved.

The acceptance contract requires the following together:

| Check | Required observation |
|---|---|
| Three prohibited sends | 3 receipts before, 0 after |
| Internal corrections after rejected sends | Both arrive once |
| Public send in a fresh public context | Arrives once |
| Public-only text after reading private data | Remains blocked; recorded as a usability cost |
| Original services | Both remain distinct processes and serve the expected tools |
| Evidence | Matching policy decisions, complete receipts, unchanged tested artifacts, and observed process exit |

Process exit and graceful application cleanup are reported separately. A missing finalizer record does not by itself establish either a leaked process or graceful cleanup.

## Try the demo on Linux

The published `v0.1.0a1` source ZIP passed the full demo on Ubuntu 24.04.3 under WSL2 with Python 3.12.3. Both fresh environments passed `pip check`, and all six backend processes were observed exiting through Linux pidfds. See the [recorded result](examples/verified-linux-demo-report.json) for the exact scope and installation conditions.

```bash
python3.12 -m venv .venv-gateway
.venv-gateway/bin/python -m pip install -r requirements-gateway.txt .
python3.12 -m venv .venv-aggregation
.venv-aggregation/bin/python -m pip install -r requirements-aggregation.txt
.venv-gateway/bin/python -m defensecheck demo \
  --gateway-python .venv-gateway/bin/python \
  --aggregation-python .venv-aggregation/bin/python \
  --output output/first-run
```

The installed demo also [passed on GitHub-hosted Ubuntu 24.04.5 / Python 3.12.14](https://github.com/yh-l20/agentsec/actions/runs/34605839564), with the same 3 → 0 prohibited receipts and 3 legitimate receipts. The [download-verified result](examples/verified-hosted-linux-demo-report.json) identifies the tested commit and artifact. The manual workflow retains complete runtime evidence for 30 days.

## Use an existing configuration

`inspect` reads a JSON `mcpServers` configuration without starting commands, calling tools, fetching policies, or printing environment values:

```powershell
& $gatewayPython -m defensecheck inspect .\client.json --source internal:get_inbox --sink mail:send_email
```

Its result is `not_tested`. Separate configured connections are a lead that needs a behavior test.

`plan` creates a reviewable candidate for the supported template:

```powershell
& $gatewayPython -m defensecheck plan .\client.json --source internal:get_inbox --sink mail:send_email --policy .\exported-active.policy --allowed-domain ourcompany.com --aggregation-python $aggregationPython --target-project reviewed-candidate --output .\output\candidate
```

The first version accepts exactly two explicit stdio entries, recognized Invariant launchers, identical gateway options and environments, absolute commands and working directories, and one complete [email-domain rule](docs/verification.md). Unknown fields, extra routes, ambiguous mappings, and unknown policies are unsupported; they are never silently removed.

The output contains:

- `client.after.json`: one gateway entry.
- `upstreams.json`: the two original downstream command definitions.
- `aggregate.py`: the launcher for the existing aggregator.
- `policy.after.txt`: the supported rule generated for the namespaced tools.
- `plan.json`: input and candidate hashes, tool mapping, and outstanding verification.

**A plan remains `candidate_unverified`.** It preserves the input file and does not deploy the target rule or change a running client. It also cannot establish that an exported policy file contains every active protection. The behavior runner currently covers the bundled synthetic contract; there is no general production `verify` command.

Candidate configuration files preserve supplied environment values. Store them with the same care as the original configuration. The summary report omits those values.

## Where this fits

[Invariant](https://github.com/invariantlabs-ai/invariant) and [Invariant Gateway](https://github.com/invariantlabs-ai/invariant-gateway) provide the policy engine and enforcement. [FastMCP](https://github.com/jlowin/fastmcp) provides service aggregation. Agent Defense Check connects configuration inspection, a narrowly supported change, and observable behavior checks.

Information-flow defenses and agent testing already have substantial prior work, including [CaMeL](https://github.com/google-research/camel-prompt-injection), [Microsoft FIDES](https://github.com/microsoft/fides), [Promptfoo](https://github.com/promptfoo/promptfoo), and [Snyk Agent Scan](https://github.com/snyk/agent-scan). The value being tested here is a reusable integration repair with evidence that normal work still succeeds. This repository does not establish a new security algorithm or an unoccupied market.

The current rule checks a single destination mailbox after a private read. It does not evaluate actual document readers, groups, guests, CC/BCC, shared links, or attachment permissions. The local adapter uses Invariant's existing `analyze_pending` API for this event-binding template; arbitrary policies need separate compatibility work.

A trusted host must keep private context attached to the guarded connection and keep users' connections separate. Reconnecting while retaining private context, or using shell/network/other tool routes, can bypass this history. Longer traces have also reached the engine's default work limit. [Verification notes](docs/verification.md) describe these boundaries.

## Development

```powershell
& $gatewayPython -m unittest discover -s tests -v
```

Unit tests cover exact policy generation, configuration preservation, unsupported inputs, candidate hashes, and planning without command execution. Runtime enforcement requires the separate demo.

Use the [integration report form](https://github.com/yh-l20/agentsec/issues/new?template=integration-result.yml) to share installation failures, unsupported configurations, observed defense gaps, or successful integrations. Include versions, what actually reached the destination, and whether normal work still succeeded. Describe configuration with credentials removed. The upstream gateway keeps its usual log under `.invariant`; the bundled demo uses synthetic data throughout.
