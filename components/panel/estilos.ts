/**
 * Marca de la opción activa que sobrevive al alto contraste de Windows (`forced-colors`): ahí
 * los fondos y bordes se pintan iguales en todas las opciones y solo quedaría el color del
 * texto. El subrayado se mantiene. Fuera de ese modo, el activo va en seminegrita.
 */
export const ACTIVO =
  "font-semibold forced-colors:underline forced-colors:decoration-2 forced-colors:underline-offset-4";
