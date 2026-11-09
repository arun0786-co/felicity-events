// dates for display. merchandise has no start or end date, only an
// order deadline, so every helper here copes with missing values.

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "");

// "17/11/2026", "17/11/2026 - 18/11/2026" or "Order by 19/11/2026"
export const whenText = (event) => {
  if (!event) return "";
  if (event.startDate) {
    const start = fmtDate(event.startDate);
    const end = event.endDate ? fmtDate(event.endDate) : start;
    return end !== start ? `${start} - ${end}` : start;
  }
  if (event.registrationDeadline) return `Order by ${fmtDate(event.registrationDeadline)}`;
  return "No date set";
};
