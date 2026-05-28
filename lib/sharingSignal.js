export function sharingSignal({ viewed, uniqueDevices }) {
  if (!viewed) return null;
  if (uniqueDevices >= 3) {
    return {
      level: "yellow",
      label: `Possibly shared — ${uniqueDevices} distinct devices`,
    };
  }
  return {
    level: "green",
    label: uniqueDevices > 1 ? `Viewed · ${uniqueDevices} devices` : "Viewed",
  };
}
