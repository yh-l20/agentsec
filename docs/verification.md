# What has been verified

The useful result is a concrete behavior change: **three prohibited sends reached the downstream service with separate connections; zero reached it with the candidate; three legitimate sends still arrived.**

This page records Windows, Ubuntu/WSL and GitHub-hosted Linux experiments. The gateway, policy engine and aggregator are actual third-party packages. The read service, receiving service, data and HTTP rule adapter are authored test components. No model or real email provider participated.

## Evidence reference

The Windows artifact reference is `output/installed-wheel-03/results.json`, generated on 2026-09-11 by running the installed wheel. The command exited zero with status `verified_for_demo_contract`. Run output is local and ignored by Git; the demo creates the same evidence structure in a fresh output directory.

The runtime-tested wheel had SHA-256 `584f69be1134db092500a52950edca827fceb70c9651195ca24388c1402ce156` and is preserved locally as `output/release-license-check/before-license-fix.whl`. Its `output/installed-wheel-03/wheel-verification.json` records that all 13 package Python files matched across the source tree, wheel, installed package and demo source hashes at the time of that run.

Before publication, the alpha was repackaged to include the complete upstream Apache-2.0 license and attribution for the adapted rule template. The README metadata was also refreshed. The release wheel is `dist/agent_defense_check-0.1.0a1-py3-none-any.whl`, SHA-256 `d6f48d71dff8273dab9f616d6b480a3f3b3da5f5796ed8b2ce89262aebf894c2`. `output/release-license-check/packaging-verification.json` confirms that its 13 Python modules are byte-identical to the runtime-tested wheel, the current source tree, the newly installed package and the recorded demo hashes. The wheel and installed distribution contain `LICENSE`, `NOTICE.md` and `LICENSES/Invariant-Apache-2.0.txt`, with the package license expression `MIT AND Apache-2.0`. Installation and the isolated CLI help check passed; the runtime demo was not repeated for this packaging change.

| Component | Observed version / source |
|---|---|
| Invariant Gateway | `0.0.9`, commit `9baeade022cc55de2412ba3dcae98069bd6f794a` |
| Invariant policy engine | `invariant-ai 0.3.5` |
| FastMCP runtime | `fastmcp-slim 4.0.3` |
| MCP packages in aggregation environment | `mcp 2.2.0`, `mcp-types 2.2.0` |
| Full Windows demo | Windows, Python 3.12.9 |
| Full Linux demo | Ubuntu 24.04.3 under WSL2, Python 3.12.3; GitHub-hosted Ubuntu 24.04.5, Python 3.12.14 |

The gateway provenance records the pinned archive URL and SHA-256 `765813aba3bb201beff502aac0a11eab4f3f064d54234a8f6ec9c521a81b5f83`. Thirty installed gateway Python files matched their installation `RECORD` hashes. This is an installation-integrity check; the run did not download the archive again and compare every installed file against it.

The original local Windows source-tree and installed-wheel suites checked 59 tests: 58 passed and one was skipped because Windows did not permit creating a test symbolic link. Neither suite had failures or errors. The Linux core suite passed all 59 tests, including the real interpreter-symlink case. An independent Linux ProcessWitness run also passed eight component tests. The published commit `3460f2b2c19e7e7450638775777218a4701b7c2f` subsequently passed all 59 core tests on each GitHub-hosted platform, Windows and Linux, plus package installation and isolated CLI startup ([Checks run](https://github.com/yh-l20/agentsec/actions/runs/34600845986)). Core tests are separate from full runtime verification.

Earlier records remain historical: `integration-01` failed its then-current shutdown criterion because fixture finalizer records were missing; that absence alone did not prove a process leak. `integration-02`, `installed-wheel-01` and `installed-wheel-02` are intermediate Windows records. The installed-wheel-03 run above is the Windows reference.

### Published alpha on Ubuntu/WSL

The public `v0.1.0a1` source ZIP was installed in two new environments on Ubuntu 24.04.3 under WSL2, Python 3.12.3, and exercised with the Linux README recipe. No dependency constraints or README commands were changed. The source ZIP SHA-256 was `ab9bfa9e1fcdd99391e876f5fa33f9cadeae4040ff2bd769ecc49cfc9f9f1f5d`; all 39 original archive files stayed unchanged. All 13 installed package Python files matched the exercised sources and the published wheel.

The demo exited zero with `verified_for_demo_contract`: prohibited receipts went from 3 to 0, and all 3 legitimate sends arrived. Policy history, final ledgers and artifact bindings reconciled. All six backend processes were captured alive and later observed exiting through Linux pidfds. The two baseline services did not write finalizer records; the four candidate and clean-public services did. The rule service exited zero without forced termination. These observations do not establish graceful cleanup of every backend.

The [selected-fields Linux report](../examples/verified-linux-demo-report.json) includes counts, package versions, process observations and installation conditions. Its raw `results.json` SHA-256 is `5ea4fde7128fb08d59c4980b7bdbd45e01cd0262e53de61abccb259584b4ce05`. All 25 original evidence files are retained locally and were checked against their copy manifest; the published summary omits local paths and synthetic payloads.

Both environments passed `pip check`. Their installation plans selected no Torch, Triton or NVIDIA/CUDA packages. The demo took 5.524 seconds in this run. The recorded install times used a cache warmed by `pip --dry-run`; neither those timings nor pip's rounded wheel-size announcements are cold-install or network-transfer benchmarks.

### GitHub-hosted Linux

The installed package passed the manual [Runtime demo run](https://github.com/yh-l20/agentsec/actions/runs/34605839564) at commit `7584dac89342bb84295fbacc3e4f21b018e23bee` on GitHub-hosted Ubuntu 24.04.5, image `20260907.300.1`, Python 3.12.14. The entry point was `python -I -m defensecheck demo`, excluding the checkout from the main process's import path. Both environments passed `pip check`.

The [download-verified summary](../examples/verified-hosted-linux-demo-report.json) records the same 3 → 0 prohibited receipts, 3 legitimate receipts and 6 observed backend exits. The downloaded evidence ZIP matched GitHub's reported SHA-256 `044aa77962ba0c8312dfcf2680ad97c1adef38321ad1098d64418864799be7a4`. All eight bound configuration/control files matched their recorded hashes, and all 13 exercised package modules matched the tested Git commit. The raw result SHA-256 is `131f6da7836b8127cd0a28ed0f780b96be7bd5b96dd9db917cb9be24d0b2e648`.

The workflow records installation and demo logs even when a later command fails, with runtime evidence when available. Complete artifacts expire after 30 days; the selected-fields summary remains in the repository. This is another synthetic runtime experiment, not an independent user's integration.

## The actual workflow

Both configurations launch the same two independent service definitions. Before the change, each service has its own Gateway connection. The candidate launches one unchanged Gateway, then the existing FastMCP aggregator, then both original services. Each workflow starts its own processes; “original services” does not mean processes survive from the baseline run into the candidate run.

The script first obtains the synthetic private marker through `get_inbox`, then makes these sends:

| Send | Before: receipts | Candidate: receipts |
|---|---:|---:|
| Private text to the external test address | 1 | 0 |
| Base64 form of the same text to that address | 1 | 0 |
| Correction to an internal address | 1 | 1 |
| Private text to the external address again | 1 | 0 |
| Another internal correction, uppercase domain | 1 | 1 |
| Public-only text after the private read | 1 | 0 |

A separate, fresh workflow sends public text without a private read. It produces one receipt. Together with the two internal corrections, that gives three successful legitimate sends.

The base64 case checks that changing the body does not change this destination-and-history rule. It does not demonstrate a general encoded-content detector. Blocking public-only text after a private read is an explicit usability cost, not a successful normal workflow.

The policy HTTP ledger shows both namespaced tools in candidate history. The downstream ledger records actual calls received by a separate process, including arguments. This is stronger evidence than the agent saying “blocked” or the proxy printing a label, but it remains a synthetic service receipt rather than email delivery.

## What counts as a completed check

A completed run needs consistent evidence across four layers:

1. **The requested call:** valid RPC response, exact tool mapping and expected arguments.
2. **The policy decision:** a successful evaluation associated with that pending call. A gateway refusal caused by an HTTP error must be classified as an availability failure, not a rule match.
3. **The downstream result:** complete receipts after the services finish, with no duplicate, altered or unexpected sends. Missing observation means incomplete.
4. **The tested artifacts:** original inputs and all candidate files must match their recorded hashes before and after execution. Running source and dependency identities must also be recorded.

`plan.json` binds `client.after.json`, `upstreams.json`, `policy.after.txt` and `aggregate.py` to their exact byte hashes. It also records the original configuration and policy hashes. Adding a hash does not itself perform runtime verification.

In the final installed-wheel run, all eight tracked input/candidate/control files matched their pre-run hashes afterward, and the generated files matched the plan's expected hashes. All 13 package Python source hashes were unchanged. Each send had a corresponding successful policy evaluation, and all final source, receiver and policy ledgers reconciled. The rule service exited zero without forced termination. These checks bind this local run; they do not attest a hostile host or prove the contents of already loaded process memory.

An exception during execution or shutdown must leave a non-passing status, including an exception after an earlier success calculation. The demo's successful label is `verified_for_demo_contract`; it covers only that run's stated contract.

The main artifacts are:

| Artifact | Evidence |
|---|---|
| `results.json` | Counts, scope, statuses, runtime identities and process observations |
| `*-events.jsonl` | Source/receiver activity and policy evaluations |
| `*.rpc.json` | Requests, responses and gateway shutdown records |
| `repair/plan.json` | Candidate paths, tool mapping, hashes and outstanding deployment work |
| `repair/client.after.json` and `repair/upstreams.json` | The proposed route and retained service commands |
| `output/installed-wheel-03/wheel-verification.json` | Tested wheel hash, source/installation correspondence, and 58 passed / 1 skipped test |

## Process exit is a separate observation

In `installed-wheel-03`, the Windows observer captured handles for all six fixture processes while they were alive and later observed all six exit. Gateway processes returned zero without the harness forcing their termination.

Both baseline fixtures wrote their finalizer records. The candidate and clean-public fixtures did not. The report therefore records OS process exit while leaving graceful application cleanup unestablished. A missing finalizer record is neither proof that a process remains alive nor proof that buffered application work was completed.

This distinction matters when adapting the test to real services that need to flush state. Their own successful shutdown contract would need to be checked.

## Exactly which policy is supported

For `get_inbox`, `send_email` and `ourcompany.com`, the complete supported source policy is:

```text
raise "External email to unknown address" if:
    (call: ToolCall) -> (call2: ToolCall)
    call is tool:get_inbox
    call2 is tool:send_email
    not (call2 is tool:send_email({
      to: "(?i)^[^@\s]+@ourcompany\.com$"
    }))
```

Names and the domain are validated inputs. The generator creates the corresponding rule for the aggregator's namespace. It does not search and replace text in arbitrary policies. The source must match the complete template; additional rules or comments are unsupported. LF and CRLF line endings are accepted.

The local test adapter invokes the official `analyze_pending(past_events, pending_events)` API. That API filters violations according to rule variables bound to pending events. This experiment uses explicit `ToolCall` bindings; it does not establish compatibility with arbitrary rules.

The plan only writes the candidate policy file. It does not install that rule in the target project or verify the complete policy set of a hosted service.

## Scope of the result

The demonstrated effect is a repaired connection layout for one explicit rule and a small set of normal workflows. It does not establish a new upstream security vulnerability, hosted-service behavior, real model attack resistance, or general enterprise confidentiality.

A host must keep private context attached to its guarded connection and separate users' execution contexts. Connection resets, direct tool access, shell/network routes and shared state remain outside this repair. Actual recipient permissions, groups, CC/BCC and attachment handling also need separate support.

Longer traces previously reached the policy engine's default work limit. The bounded demo makes no performance or safety claim for unlimited sessions. The Ubuntu/WSL result covers its recorded platform and dependencies; it does not establish compatibility with every Linux distribution or Python version.
