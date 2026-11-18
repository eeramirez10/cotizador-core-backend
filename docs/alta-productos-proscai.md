# Alta de productos en Proscai

1. Ventas agrega el producto local a la cotización. El producto puede cotizarse sin un código ERP, conforme a la configuración del sistema.
2. En **Requisiciones → Gestionar partida → Ficha de alta ERP**, Compras revisa la descripción, los datos técnicos y los campos de Proscai. Guardar la ficha solo guarda un borrador en el cotizador.
3. Con la cotización aprobada por el cliente, Compras de la sucursal o Administración usa **Confirmar código ERP**. Si el código no existe para la sucursal, Compras realiza el alta manual en Proscai y vuelve a verificarlo. La consulta usa el ICOD exacto y la cuenta primaria (ICTA); no requiere stock ni costo. La unidad debe coincidir.
4. Al confirmar se actualizan la partida de requisición y su partida de cotización. El producto conserva su identidad local. En **Productos locales → Vínculos ERP** se ven los códigos verificados y las requisiciones accesibles. En el editor de una nueva cotización, **Código ERP de sucursal** permite aplicar el vínculo de forma explícita.

Si ya se emitió una requisición al proveedor sin código, solo se puede completar el primer código faltante. No se regeneran el documento ni las propuestas. El pedido TXT sigue requiriendo el código ERP verificado en las partidas locales, incluso si se permite exportar sin stock.

No hay escritura ni importación de archivos en Proscai. La migración crea una tabla de vínculos y no toma códigos históricos como verificados. No requiere nuevas variables ni cambios en IA.

## Despliegue en staging

Promover las tres ramas por el flujo habitual. Actualizar primero el backend ERP, aplicar la migración `20261113130000_add_branch_product_erp_links` al core de staging, actualizar el core y finalmente publicar el frontend de staging. Usar un material ya existente en Proscai para la prueba de staging, sin dar de alta un producto real como parte de la prueba.

Para correr la prueba integral en desarrollo, aplicar las migraciones a un PostgreSQL desechable en `127.0.0.1` con base `erp_link_test`. Ejecutar `node --import tsx --test test/branch-product-erp-link.integration.test.ts` con `ERP_LINK_TEST_DATABASE_URL` apuntando a esa base. La prueba usa datos sintéticos y un ERP simulado.
