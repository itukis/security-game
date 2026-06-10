// Aggregator for per-problem content. Each problem lives in its own file
// under `./problems/<name>.ts` for editability; this module re-exports the
// shared types and assembles the canonical `problemContent` map, the display
// `problemOrder`, and `getProblemContent` lookup.

import { sqliLogin } from "./problems/sqliLogin";
import { xssComments } from "./problems/xssComments";
import { idorProfile } from "./problems/idorProfile";
import { pathTraversalFiles } from "./problems/pathTraversalFiles";
import { cmdInjectionPing } from "./problems/cmdInjectionPing";
import { csrfTransfer } from "./problems/csrfTransfer";
import { hardcodedSecrets } from "./problems/hardcodedSecrets";
import { openRedirect } from "./problems/openRedirect";
import { fileUpload } from "./problems/fileUpload";
import { reviewSupportPortal } from "./problems/reviewSupportPortal";
import { reviewAccountWorkflow } from "./problems/reviewAccountWorkflow";
import { reviewFileWorkbench } from "./problems/reviewFileWorkbench";
import type { ProblemContent, ProblemId } from "./problems/_shared";

export type { ProblemId, ProblemContent } from "./problems/_shared";

export const problemContent: Record<ProblemId, ProblemContent> = {
  "sqli-login": sqliLogin,
  "xss-comments": xssComments,
  "idor-profile": idorProfile,
  "path-traversal-files": pathTraversalFiles,
  "cmd-injection-ping": cmdInjectionPing,
  "csrf-transfer": csrfTransfer,
  "hardcoded-secrets": hardcodedSecrets,
  "open-redirect": openRedirect,
  "file-upload": fileUpload,
  "review-support-portal": reviewSupportPortal,
  "review-account-workflow": reviewAccountWorkflow,
  "review-file-workbench": reviewFileWorkbench,
};

export const problemOrder: ProblemId[] = [
  "sqli-login",
  "xss-comments",
  "idor-profile",
  "path-traversal-files",
  "cmd-injection-ping",
  "csrf-transfer",
  "hardcoded-secrets",
  "open-redirect",
  "file-upload",
  "review-support-portal",
  "review-account-workflow",
  "review-file-workbench",
];

export function getProblemContent(id: string): ProblemContent | undefined {
  return (problemContent as Record<string, ProblemContent>)[id];
}
