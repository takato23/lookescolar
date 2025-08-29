1-voy  a http://localhost:3000/admin/photos?eventId=d8dc56fb-4fd8-4a9b-9ced-3d1df867bb99&event_id=d8dc56fb-4fd8-4a9b-9ced-3d1df867bb99

Las foto siguen en este loop eterno que aparcen y desaparecen:

}
[INFO] auth_dev_bypass_success {
  requestId: 'req_edacb8247907f3f5',
  timestamp: '2025-08-28T14:25:19.399Z',
  level: 'info',
  event: 'auth_dev_bypass_success',
  host: 'localhost:3000',
  ip: '::1'
}
 GET /admin/previews/6MVDpWu9Zsak_preview.webp 302 in 59ms
 GET /admin/previews/xt0cZI-W5N9f_preview.webp 302 in 59ms
 GET /admin/previews/c0fcGc_m9QyY_preview.webp 302 in 59ms


 2-- Si toco "ir a galeria publica"  http://localhost:3000/f/ljjeqxvrpetc6xgrftslq/enhanced-page?folder=b0d178a1-90cb-45e4-bc7f-10838c5620b7&mode=folder

 3- cuadno voy a  /admin/publish y toco "publicar" obtengo :

 [PERF] Started bulk_publish: {itemCount: 1, type: 'bulk'}
useFolderPublishData.ts:337 [BULK] Starting bulk publish for 1 folders
useFolderPublishData.ts:377 [BULK] Published 1/1 folders in 602ms
publish-performance-monitor.ts:123 [PERF] ✅ bulk_publish completed in 655ms (1.5 items/s)

