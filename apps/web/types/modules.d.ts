/**
 * Module declarations for libraries without published types.
 * Using any so these can be used as JSX and with dynamic().
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "@imc-trading/react-pivottable" {
  export const PivotTableUI: any;
  export const TableRenderers: any;
  export function createPlotlyRenderers(Plot: any): any;
}

declare module "react-plotly.js" {
  const Plot: any;
  export default Plot;
}
