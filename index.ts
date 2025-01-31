import { HTTP } from "@cerbos/http";
import { readPolicy } from "@cerbos/files";
import * as path from "path";
import {
  Effect,
  policyIsResourcePolicy,
  policyIsRolePolicy,
  ResourceRule,
  ScopePermissions,
} from "@cerbos/core";

const cerbos = new HTTP("http://localhost:3592", {
  adminCredentials: {
    username: "cerbos",
    password: "cerbos",
  },
});

async function bootstrapInitialPolicies() {
  const resourcePolicyPath = path.resolve(__dirname, "policies/table.yaml");
  const rolePath = path.resolve(__dirname, "policies/roles.yaml");

  // Table resource and common_derived_roles policy are loaded from the policies folder.
  await cerbos.addOrUpdatePolicies({
    policies: [
      await readPolicy(resourcePolicyPath),
      await readPolicy(rolePath),
    ],
  });
}

async function addRuleToResource(policyId: string, rule: ResourceRule) {
  // When adding a policy it needs to be read, mutatated and then written back
  // as a complete policy so the PDP can validate it.
  // Load the policy
  const policy = await cerbos.getPolicy(policyId);

  if (!policy || !policyIsResourcePolicy(policy)) {
    throw new Error("Policy not found");
  }

  // Add the rule
  policy.resourcePolicy.rules.push(rule);

  // Write it back
  await cerbos.addOrUpdatePolicies({
    policies: [policy],
  });
}

(async () => {
  await bootstrapInitialPolicies();

  addRuleToResource("resource.table.v1", {
    name: "allow_update_columns",
    actions: ["update:columns"],
    roles: ["USER"],
    effect: Effect.ALLOW,
    condition: {
      match: {
        all: {
          of: [
            {
              expr: "P.id == R.attr.createdByUserId",
            },
          ],
        },
      },
    },
  });

  await cerbos.addOrUpdatePolicies({
    policies: [
      {
        /**
         * We can create a role policy with list of allowed actions for a resource.
         * Conditions for those actions is checked inside the resource policy, in order to allow/deny the actions.
         */
        rolePolicy: {
          role: "COLUMN_VIEWER",
          scopePermissions:
            ScopePermissions.REQUIRE_PARENTAL_CONSENT_FOR_ALLOWS,
          rules: [
            {
              resource: "table",
              allowActions: ["view:columns"],
            },
          ],
        },
      },
    ],
  });

  const decision = await cerbos.checkResource({
    includeMetadata: true,
    principal: {
      id: "user_1",
      roles: ["USER", "COLUMN_VIEWER"], // COLUMN_VIEWER role can be reused and added to any group/user
      attr: {
        tenantId: "tenant_1",
        organizationId: "org_1",
      },
    },
    resource: {
      kind: "table",
      policyVersion: "1",
      id: "1",
      attr: {
        tenantId: "tenant_2",
        organizationId: "org_1",
        createdByUserId: "user_1",
        whitelistedColumns: ["*"],
        columns: ["id", "name", "age"],
      },
    },
    actions: ["view:columns"],
  });

  console.log(
    `can user_1 view columns of table_1? ${
      decision.isAllowed("view:columns") ? "Yes" : "No"
    }`
  );
})();
