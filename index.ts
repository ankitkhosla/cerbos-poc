import { HTTP } from'@cerbos/http'
import { readPolicy } from"@cerbos/files"
import * as path from'path'
import { Effect, matchIsMatchAll } from '@cerbos/core';

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
      resourcePolicy: {
        resource: "table",
        version: "1",
        scope: "tenant",
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
    }],
  });

  const decision = await cerbos.checkResource({
    includeMetadata: true,
    principal: {
      id: "user_1",
      roles: ["USER"],
      attr:{
        tenantId: "tenant_1",
        organizationId: "org_1"
      }
    },
    resource: {
      kind: "table",
      policyVersion: "1",
      id: "1",
      scope: "tenant",
      attr: {
        createdByUserId: "user_2"
      }
    },
    actions: ["update:columns"],
  });

  console.log(decision.metadata?.actions);
})()