

al intenitar comprar fotografias en la tienda: 

PublicGallery.tsx:279  POST http://localhost:3000/api/gallery/checkout 500 (Internal Server Error)

PublicGallery.tsx:295 [Service] Public checkout error: Error: Internal server error
    at onClick (PublicGallery.tsx:290:31)



3-

 las fotografias subidas tienen mucha calidad, deberian tener poca calidad sino ocupa n muchoe spacio y se peud descargar

4- cuando etiuqetio a alguien:

page.tsx:259  POST http://localhost:3000/api/admin/tagging 404 (Not Found)
handlePhotoTag @ page.tsx:259
PhotoGalleryModern.useCallback[handleManualTag] @ PhotoGalleryModern.tsx:1169
handleTag @ TaggingModal.tsx:132
handleConfirmTag @ TaggingModal.tsx:149
executeDispatch @ react-dom-client.development.js:16922
runWithFiberInDEV @ react-dom-client.development.js:873
processDispatchQueue @ react-dom-client.development.js:16972
eval @ react-dom-client.development.js:17573
batchedUpdates$1 @ react-dom-client.development.js:3313
dispatchEventForPluginEventSystem @ react-dom-client.development.js:17126
dispatchEvent @ react-dom-client.development.js:21309
dispatchDiscreteEvent @ react-dom-client.development.js:21277Understand this error
PhotoGalleryModern.tsx:1188 Error tagging photo manually: Error: Error tagging photo
    at handlePhotoTag (page.tsx:266:13)
    at async PhotoGalleryModern.useCallback[handleManualTag] (PhotoGalleryModern.tsx:1169:7)
    at async handleTag (TaggingModal.tsx:132:7)
error @ intercept-console-error.js:57
PhotoGalleryModern.useCallback[handleManualTag] @ PhotoGalleryModern.tsx:1188
await in PhotoGalleryModern.useCallback[handleManualTag]
handleTag @ TaggingModal.tsx:132
handleConfirmTag @ TaggingModal.tsx:149
executeDispatch @ react-dom-client.development.js:16922
runWithFiberInDEV @ react-dom-client.development.js:873
processDispatchQueue @ react-dom-client.development.js:16972
eval @ react-dom-client.development.js:17573
batchedUpdates$1 @ react-dom-client.development.js:3313
dispatchEventForPluginEventSystem @ react-dom-client.development.js:17126
dispatchEvent @ react-dom-client.development.js:21309
dispatchDiscreteEvent @ react-dom-client.development.js:21277Understand this error
TaggingModal.tsx:136 Error tagging photo: Error: Error tagging photo
    at handlePhotoTag (page.tsx:266:13)
    at async PhotoGalleryModern.useCallback[handleManualTag] (PhotoGalleryModern.tsx:1169:7)
    at async handleTag (TaggingModal.tsx:132:7)





    ---------


----

6-- SI no etiueqeto , en "Fotos del evento" die "3 fotos necesitan ser etiquetadas": PEro no puedo verlas porque dice lo de etiqeutarlas. Que no haga falta etiuqetarlas, que tambien las puedas mover ahi manualmente. 


7-  link publico http://localhost:3000/gallery/c8455305-2315-4aec-9fd8-ae05b38589d9
http://localhost:3000/admin/events/c8455305-2315-4aec-9fd8-ae05b38589d9

8- las fotos se ven con la watermark. pero sila clickeo, tineen resolucion de varios megapixeles, deberia ser una iamgen mas chica. adjunto foto 

9- cuando pongo "COntiunar el pago", me dice




