---
description: Explicar que la bitácora ahora es automática
---

# /bitacora

Esta bitácora ya no se llena a mano. Desde el commit que agregó
`scripts/log-bitacora.cjs` y `.githooks/post-commit`, cada commit agrega solo
una fila en `docs/bitacoras/<persona>.md` con fecha, usuario, descripción y
archivos modificados.

No edites esas tablas directamente: el hook las reescribe en cada commit. Si
necesitas más detalle, documenta la decisión en el propio commit (el mensaje
es lo que se registra como "Descripción del cambio").

Ver [`docs/bitacoras/README.md`](../../docs/bitacoras/README.md) para cómo
activar el hook (`git config core.hooksPath .githooks`) y el mapa de
identidad (`EMAIL_MAP` en `scripts/log-bitacora.cjs`).
