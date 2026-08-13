// Casos documentais usados pelo check TypeScript; a suíte executável está no script da API.
import { getGenericAssetKind } from './assetPresentation';

export const presentationCases = {
  accessPoint: getGenericAssetKind('Redes Sem Fio'),
  switch: getGenericAssetKind('Redes & Switches'),
  unknown: getGenericAssetKind('Outros'),
} as const;
