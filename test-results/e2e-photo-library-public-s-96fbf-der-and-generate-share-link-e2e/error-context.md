# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Saltar al contenido principal" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e10]:
    - generic [ref=e11]:
      - heading "APERTURA" [level=1] [ref=e12]
      - paragraph [ref=e13]: Acceso a tu cuenta
    - generic [ref=e15]:
      - generic [ref=e16]:
        - generic [ref=e17]: Correo electrónico
        - textbox "Correo electrónico" [ref=e19]: admin@lookescolar.com
      - generic [ref=e20]:
        - generic [ref=e21]: Contraseña
        - textbox "Contraseña" [ref=e23]: test-password
      - generic [ref=e24]: Credenciales inválidas
      - button "Iniciar Sesión" [ref=e26] [cursor=pointer]:
        - generic [ref=e27] [cursor=pointer]: Iniciar Sesión
      - generic [ref=e28]:
        - paragraph [ref=e29]:
          - generic [ref=e30]: 🔒
          - text: Protegido por rate limiting y autenticación segura
        - paragraph [ref=e31]: "Intentos realizados: 1/3"
    - paragraph [ref=e33]:
      - text: ¿No tienes cuenta?
      - link "Regístrate" [ref=e34] [cursor=pointer]:
        - /url: /register
    - link "← Volver al inicio" [ref=e36] [cursor=pointer]:
      - /url: /
      - generic [ref=e37] [cursor=pointer]: ←
      - generic [ref=e38] [cursor=pointer]: Volver al inicio
  - region "Notifications alt+T"
  - generic [ref=e39]:
    - img [ref=e41]
    - button "Open Tanstack query devtools" [ref=e89] [cursor=pointer]:
      - img [ref=e90] [cursor=pointer]
  - alert [ref=e138]: Lumina | Tu negocio de fotografía, simplificado
```