# Control de urgencia: Superposición del contenedor de resultados Empathy

## Contexto del problema

El componente `empathy-results` renderiza un `div` con el atributo `data-teleport="empathy-results-container"`, dentro del cual el script de Empathy inyecta dinámicamente los resultados de búsqueda.

Para lograr que este contenedor se superpusiera visualmente sobre el contenido del home, la implementación original utilizaba `position: absolute` con un valor fijo de `top: 64px` (la altura asumida del header). Esto generaba un problema de compatibilidad: **cada tienda puede tener un header de altura distinta**, lo que hacía que el contenedor de resultados quedara desposicionado en cualquier cliente que no tuviera exactamente ese header.

## Causa raíz

El script de Empathy tiene un comportamiento nativo: cuando inyecta contenido en el elemento marcado con `data-teleport`, **oculta automáticamente todos sus elementos hermanos** (`display: none`) y los restaura cuando se cierra. Este comportamiento elimina la necesidad de cualquier posicionamiento absoluto o truco de CSS para la superposición.

El problema era que el contenido del home (banners, sliders, secciones) no eran hermanos del `div` de teleport — estaban en otro nivel del DOM — por lo que el script no los ocultaba.

## Solución

Se reestructuró el bloque `empathy-results` para que **acepte hijos** (`composition: "children"`). Al declarar el contenido del home como hijos de `empathy-results`, estos quedan como hermanos directos del `div` de teleport en el DOM, y el script de Empathy los oculta y restaura de forma automática.

## Cambios necesarios por cliente

### 1. `react/Components/EmpathyResults/index.tsx`

El componente debe recibir y renderizar `children` como hermanos del `div` de teleport:

```tsx
const EmpathyResults: React.FC<Props> = ({ children }) => {
    return (
        <div data-teleport="empathy-results-container" id="empathy-results-container">
            {children}
        </div>
    )
}
```

### 2. `store/interfaces.json`

Declarar que el bloque acepta hijos:

```json
"empathy-results": {
    "component": "EmpathyResults",
    "composition": "children",
    "allowed": "*"
}
```

### 3. Store theme del cliente (`store.home` o equivalente)

Todo el contenido que estuviera directamente en el home debe pasarse como hijos de `empathy-results`:

```jsonc
"store.home": {
    "blocks": ["empathy-results"]
},
"empathy-results": {
    "children": [
        "flex-layout.row#hero",
        "flex-layout.row#integrate",
        "flex-layout.row#promises"
        // ... todo lo que tenga el home del cliente
    ]
}
```

Con estos tres cambios, el comportamiento de superposición queda delegado completamente al script nativo de Empathy, sin depender de la altura del header de ninguna tienda.
