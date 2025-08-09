error supabase:
ERROR:  42601: syntax error at or near "NOT"
LINE 237: ALTER TABLE subject_tokens ADD CONSTRAINT IF NOT EXISTS subject_tokens_min_length 
                                                       ^

                                     ----

                                     error consola:
                                     santiagobalosky@MacBook-Pro-de-Santiago LookEscolar % npm run build 

> lookescolar@0.1.0 build
> next build

 ⚠ Invalid next.config.js options detected: 
 ⚠     Unrecognized key(s) in object: 'removeTestFiles' at "compiler"
 ⚠     Expected object, received boolean at "experimental.serverActions"
 ⚠     Unrecognized key(s) in object: 'fontLoaders', 'runtime', 'modularizeImports' at "experimental"
 ⚠     Unrecognized key(s) in object: 'swcMinify', 'optimizeFonts'
 ⚠ See more info here: https://nextjs.org/docs/messages/invalid-next-config
 ⚠ The "experimental.esmExternals" option has been modified. experimental.esmExternals is not recommended to be modified as it may disrupt module resolution. It should be removed from your next.config.js.
 ⚠ Warning: Found multiple lockfiles. Selecting /Users/santiagobalosky/package-lock.json.
   Consider removing the lockfiles at:
   * /Users/santiagobalosky/LookEscolar/package-lock.json

   ▲ Next.js 15.4.5
   - Environments: .env.local
   - Experiments (use with caution):
     · runtime: "nodejs"
     ✓ optimizeCss
     · fontLoaders
     · esmExternals: "loose"
     ✓ serverActions
     · modularizeImports

   Creating an optimized production build ...
   Using tsconfig file: ./tsconfig.json

> Build error occurred
[Error: The key "NODE_ENV" under "env" in next.config.js is not allowed. https://nextjs.org/docs/messages/env-key-not-allowed]
santiagobalosky@MacBook-Pro-de-Santiago LookEscolar % npm run typecheck

> lookescolar@0.1.0 typecheck
> tsc --noEmit

__tests__/mercadopago-integration.test.ts:182:19 - error TS1005: ',' expected.

182                 }))
                      ~

__tests__/mercadopago-integration.test.ts:183:15 - error TS1005: ',' expected.

183               }))
                  ~

__tests__/mercadopago-integration.test.ts:186:10 - error TS1005: ',' expected.

186         }))
             ~

__tests__/mercadopago-integration.test.ts:186:11 - error TS1005: ';' expected.

186         }))
              ~

__tests__/mercadopago-integration.test.ts:187:8 - error TS1005: ')' expected.

187       };
           ~

__tests__/mercadopago-integration.test.ts:194:5 - error TS1128: Declaration or statement expected.

194     });
        ~

__tests__/mercadopago-integration.test.ts:194:6 - error TS1128: Declaration or statement expected.

194     });
         ~

__tests__/mercadopago-integration.test.ts:205:19 - error TS1005: ',' expected.

205                 }))
                      ~

__tests__/mercadopago-integration.test.ts:206:15 - error TS1005: ',' expected.

206               }))
                  ~

__tests__/mercadopago-integration.test.ts:209:10 - error TS1005: ',' expected.

209         }))
             ~

__tests__/mercadopago-integration.test.ts:209:11 - error TS1005: ';' expected.

209         }))
              ~

__tests__/mercadopago-integration.test.ts:210:7 - error TS1128: Declaration or statement expected.

210       };
          ~

__tests__/mercadopago-integration.test.ts:217:5 - error TS1128: Declaration or statement expected.

217     });
        ~

__tests__/mercadopago-integration.test.ts:217:6 - error TS1128: Declaration or statement expected.

217     });
         ~

__tests__/mercadopago-integration.test.ts:228:19 - error TS1005: ',' expected.

228                 }))
                      ~

__tests__/mercadopago-integration.test.ts:229:15 - error TS1005: ',' expected.

229               }))
                  ~

__tests__/mercadopago-integration.test.ts:232:10 - error TS1005: ',' expected.

232         }))
             ~

__tests__/mercadopago-integration.test.ts:232:11 - error TS1005: ';' expected.

232         }))
              ~

__tests__/mercadopago-integration.test.ts:233:7 - error TS1128: Declaration or statement expected.

233       };
          ~

__tests__/mercadopago-integration.test.ts:241:5 - error TS1128: Declaration or statement expected.

241     });
        ~

__tests__/mercadopago-integration.test.ts:241:6 - error TS1128: Declaration or statement expected.

241     });
         ~

__tests__/mercadopago-integration.test.ts:242:3 - error TS1128: Declaration or statement expected.

242   });
      ~

__tests__/mercadopago-integration.test.ts:242:4 - error TS1128: Declaration or statement expected.

242   });
       ~

__tests__/mercadopago-integration.test.ts:253:17 - error TS1005: ',' expected.

253               }))
                    ~

__tests__/mercadopago-integration.test.ts:254:13 - error TS1005: ',' expected.

254             }))
                ~

__tests__/mercadopago-integration.test.ts:259:10 - error TS1005: ',' expected.

259         }))
             ~

__tests__/mercadopago-integration.test.ts:259:11 - error TS1005: ';' expected.

259         }))
              ~

__tests__/mercadopago-integration.test.ts:260:7 - error TS1128: Declaration or statement expected.

260       };
          ~

__tests__/mercadopago-integration.test.ts:269:5 - error TS1128: Declaration or statement expected.

269     });
        ~

__tests__/mercadopago-integration.test.ts:269:6 - error TS1128: Declaration or statement expected.

269     });
         ~

__tests__/mercadopago-integration.test.ts:282:17 - error TS1005: ',' expected.

282               }))
                    ~

__tests__/mercadopago-integration.test.ts:283:13 - error TS1005: ',' expected.

283             }))
                ~

__tests__/mercadopago-integration.test.ts:285:10 - error TS1005: ',' expected.

285         }))
             ~

__tests__/mercadopago-integration.test.ts:285:11 - error TS1005: ';' expected.

285         }))
              ~

__tests__/mercadopago-integration.test.ts:286:7 - error TS1128: Declaration or statement expected.

286       };
          ~

__tests__/mercadopago-integration.test.ts:295:5 - error TS1128: Declaration or statement expected.

295     });
        ~

__tests__/mercadopago-integration.test.ts:295:6 - error TS1128: Declaration or statement expected.

295     });
         ~

__tests__/mercadopago-integration.test.ts:349:3 - error TS1128: Declaration or statement expected.

349   });
      ~

__tests__/mercadopago-integration.test.ts:349:4 - error TS1128: Declaration or statement expected.

349   });
       ~

__tests__/mercadopago-integration.test.ts:432:1 - error TS1128: Declaration or statement expected.

432 });
    ~

__tests__/mercadopago-integration.test.ts:432:2 - error TS1128: Declaration or statement expected.

432 });
     ~

__tests__/storage.service.test.ts:59:1 - error TS1005: ',' expected.

59 }
   ~


Found 42 errors in 2 files.

Errors  Files
    41  __tests__/mercadopago-integration.test.ts:182
     1  __tests__/storage.service.test.ts:59
santiagobalosky@MacBook-Pro-de-Santiago LookEscolar % pm run test:security
zsh: command not found: pm
santiagobalosky@MacBook-Pro-de-Santiago LookEscolar %                   