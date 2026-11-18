# Auditoría de idioma

Objetivo: la interfaz y el contenido editorial de Modo Cultiva deben seguir
el idioma activo en las 11 variantes ofrecidas. Las entradas del usuario,
los nombres propios y los originales de fuentes externas no deben sufrir
traducciones automáticas ni perder su atribución.

## Hallazgos de la primera revisión

Se revisaron las cadenas directas de JSX mediante el AST de TypeScript y
se contrastaron las claves literales de `tr`/`trf` con los dos catálogos de
`App.tsx`. Todas esas claves tenían entradas en los 11 idiomas; ese control
por sí solo no detecta frases de JSX, datos editoriales ni valores que se
guardan ya traducidos.

- La mutación de texto en todo el DOM no distinguía interfaz de contenido del
  usuario, y un cambio de idioma remontaba el árbol de React. La primera
  corrección mueve el idioma a la renderización, preserva el árbol, y añade
  el mismo selector al menú de Inicio.
- Las diez frases de saludo y las veinte citas de Inicio tienen traducción
  editorial directa. Las citas conservan la asociación con su autor, enlace
  y modo. Las tarjetas de los doce modos tienen descripciones breves
  independientes en los once idiomas.
- El acceso y los errores de acceso ya no dependen de mensajes de error del
  servidor escritos en un único idioma. El título del perfil del fundador y
  sus etiquetas también siguen el idioma, sin alterar el nombre.
- El navegador determina el idioma si no hay elección manual. Un cambio
  del navegador no sustituye la preferencia manual de la cuenta o invitado.
  La prueba de navegador recorre los 11 idiomas, verifica dirección RTL,
  recarga, persistencia de la procedencia, identidad, mapa y configuraciones,
  y que cambiar de idioma no reemplace ni traduzca contenido de usuario.

## Contenido de los modos y de las actividades

- Journey cuenta con descripciones extensas propias de los doce modos en
  los once idiomas. En Trivia, cada modo tiene una pregunta y una respuesta
  específicas en cada idioma.
- Las 28 citas de Recomendaciones tienen traducción editorial en el idioma
  activo. Se conservan el original en inglés, su autor y el enlace a la
  fuente. El selector de citas anuncia el título traducido del ejercicio.
- Modo IA traduce los avisos al mostrarlos. No borra el contexto ni la
  propuesta al cambiar el idioma: cada consulta usa el idioma activo cuando
  se envía, y el resultado conserva su idioma original.

## Pendientes para cerrar el objetivo

| Superficie | Evidencia y siguiente verificación |
| --- | --- |
| Modo Global y especialistas | Algunos datos de demostración, especialidades, ciudades, biografías y títulos de ejemplo siguen en español o se sustituyen por una descripción genérica. Distinguir contenido editorial traducible de nombres, idiomas nativos y contenido del usuario. |
| Planes y accesos especiales | La rama desactivada por la configuración de acceso gratuito aún contiene copy literal. Auditar también errores, accesibilidad y variantes de conexión. |
| Interfaces restantes | Revisar pantallas y diálogos visibles de Centro de Control, Insignias, configuraciones, comunidad, tarjeta pública, instalación, evidencias y notificaciones; comprobar texto visible y accesible, no solo claves. |
| Persistencia entre sesiones | Ejecutar matriz de idiomas en bienvenida y navegación, recarga, navegador distinto y cambio de cuenta. Comprobar que la preferencia de una cuenta no contamine a otra ni al invitado. |

El objetivo sigue abierto hasta contrastar el recorrido completo en la
aplicación y comprobar el despliegue en DEV. No hay cambios en producción,
credenciales añadidas, ni migraciones.
