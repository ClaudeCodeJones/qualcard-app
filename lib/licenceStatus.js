export function getLicenceStatus(licenceEndDate) {
  if (!licenceEndDate) {
    return {
      status: "Payment Pending",
      dateLabel: null,
      showButton: true,
      buttonLabel: "Activate",
      daysLeft: null,
    }
  }

  const now = new Date()
  const end = new Date(licenceEndDate)
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) {
    return {
      status: "Expired",
      dateLabel: "Expired",
      showButton: true,
      buttonLabel: "Renew Now",
      daysLeft,
    }
  }

  if (daysLeft <= 30) {
    return {
      status: "Expiring Soon",
      dateLabel: "Expires",
      showButton: true,
      buttonLabel: "Renew Now",
      daysLeft,
    }
  }

  if (daysLeft <= 90) {
    return {
      status: "Active",
      dateLabel: "Expires",
      showButton: true,
      buttonLabel: "Renew",
      daysLeft,
    }
  }

  return {
    status: "Active",
    dateLabel: "Expires",
    showButton: false,
    buttonLabel: null,
    daysLeft,
  }
}
