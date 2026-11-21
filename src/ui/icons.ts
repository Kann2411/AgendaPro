/** Iconos (MaterialCommunityIcons) asociados a estados y métodos de pago. */
export const STATUS_ICONS: Record<string, string> = {
  pending: "clock-outline",
  confirmed: "check-circle-outline",
  in_progress: "progress-clock",
  completed: "check-all",
  cancelled: "close-circle-outline",
  no_show: "account-cancel-outline",
};

export const METHOD_ICONS: Record<string, string> = {
  cash: "cash",
  transfer: "bank-transfer",
  card: "credit-card-outline",
  other: "dots-horizontal-circle-outline",
};
