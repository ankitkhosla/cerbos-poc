import { HTTP } from'@cerbos/http'
import { readPolicy } from"@cerbos/files"
import * as path from'path'
import { Effect, ScopePermissions } from '@cerbos/core';

const cerbos = new HTTP("http://localhost:3592", {
  adminCredentials:{
    username: "cerbos",
    password: "cerbos",
  }
});

(async () => { 
  const policyPath = path.resolve(__dirname, 'policies/table.yaml');
  const rolePath = path.resolve(__dirname, 'policies/roles.yaml');

  await cerbos.addOrUpdatePolicies({
    policies: [await readPolicy(policyPath), await readPolicy(rolePath)],
  });

  await cerbos.addOrUpdatePolicies({
    policies: [{
      /**
       * We can create a new policy, although this replaces the existing policy with the same resource and version. Hence, version:2 is being used below. 
       * Would be checking with their team to see if there is a way to add a new policy without replacing the existing one.
       */
      resourcePolicy: {
        resource: "table",
        version: "2",
        rules: [{
          name: "allow_update_columns",
          actions: ["update:columns"],
          effect: Effect.ALLOW,
          condition: {
            match: {
              all: {
                of: [{
                  expr: "P.id == R.attr.createdByUserId"
                }]
              }
            }
          }
        }],
      },
      /**
       * We can create a role policy with list of allowed actions for a resource. 
       * Conditions for those actions is checked inside the resource policy, in order to allow/deny the actions. 
       */
      rolePolicy: {
        role: "COLUMN_VIEWER",
        scopePermissions: ScopePermissions.REQUIRE_PARENTAL_CONSENT_FOR_ALLOWS,
        rules: [{
          resource: "table",
          allowActions: ["view:columns"],
        }],
      },
    }],
  });

  const decision = await cerbos.checkResource({
    includeMetadata: true,
    principal: {
      id: "user_1",
      roles: ["USER", "COLUMN_VIEWER"], // COLUMN_VIEWER role can be reused and added to any group/user 
      attr:{
        tenantId: "tenant_1",
        organizationId: "org_1"
      }
    },
    resource: {
      kind: "table",
      policyVersion: "1",
      id: "1",
      attr: {
        tenantId: "tenant_2",
        organizationId: "org_1",
        createdByUserId: "user_1",
        whitelistedColumns:['*'],
        columns: ['id', 'name', 'age']
      }
    },
    actions: ["view:columns"],
  });

  console.log(`can user_1 view columns of table_1? ${decision.isAllowed("view:columns")? 'Yes' : 'No'}`);
})()