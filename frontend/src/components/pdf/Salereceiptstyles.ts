import { StyleSheet } from "@react-pdf/renderer";

export const COLOR_ORANGE = "#F36B21";
export const COLOR_LIGHT_ORANGE = "#FDB99B";
export const COLOR_BORDER = "#8B4513";

export const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 28,
    fontFamily: "Sarabun",
    fontSize: 10,
  },

  // Header
  header: {
    flexDirection: "row",
    marginBottom: 5,
    alignItems: "flex-start",
  },
  logoContainer: {
    width: 80,
    height: 80,
    marginRight: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  companyInfo: {
    flex: 1,
    textAlign: "center",
    paddingTop: 6,
  },
  companyName: {
    fontSize: 11,
    marginBottom: 2,
  },
  companyDetail: {
    fontSize: 7.5,
    marginBottom: 1,
  },
  badgeContainer: {
    width: 55,
  },
  badge: {
    border: `2pt solid ${COLOR_ORANGE}`,
    borderRadius: 2,
    padding: 3,
  },
  badgeText: {
    fontSize: 9,
    color: COLOR_ORANGE,
    textAlign: "center",
    fontWeight: 'bold',
  },

  // Title
  titleBox: {
    border: `2pt solid ${COLOR_BORDER}`,
    borderRadius: 2,
    padding: 4,
    textAlign: "center",
    marginBottom: 6,
    alignSelf: "center",
  },
  title: {
    fontSize: 12,
  },

  // Customer Info
  customerSection: {
    flexDirection: "row",
    marginBottom: 5,
  },
  leftInfo: {
    width: "55%",
    paddingRight: 8,
  },
  rightInfo: {
    width: "45%",
    paddingLeft: 8,
    alignItems: "flex-end",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 2,
    fontSize: 9,
    alignItems: "flex-start",
  },
  rightInfoRow: {
    flexDirection: "row",
    marginBottom: 2,
    fontSize: 9,
    justifyContent: "flex-end",
    width: "100%",
  },
  rightInfoLabel: {
    width: 40,
    textAlign: "right",
    marginRight: 6,
  },
  rightInfoValue: {
    width: 140,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  infoLabel: {
    width: 75,
  },
  infoValue: {
    flex: 1,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  infoValueMultiline: {
    flex: 1,
    paddingHorizontal: 3,
    paddingVertical: 1,
    minHeight: 20,
  },

  // Table
  table: {
    border: `1.5pt solid #000`,
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLOR_LIGHT_ORANGE,
    padding: 4,
    borderBottom: `1.5pt solid #000`,
  },
  headerText: {
    fontSize: 8.5,
  },
  col1: { width: "40%" },
  col2: { width: "10%", textAlign: "center" },
  col3: { width: "12%", textAlign: "center" },
  col4: { width: "19%", textAlign: "right" },
  col5: { width: "19%", textAlign: "right" },
  tableBody: {
    minHeight: 145,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderBottom: `0.5pt solid #eee`,
    fontSize: 8.5,
  },
  emptyRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderBottom: `0.5pt solid #eee`,
    minHeight: 18,
  },
  giftRow: {
    paddingVertical: 4,
    paddingHorizontal: 5,
    backgroundColor: "#fffef7",
    borderTop: `1pt solid #000`,
    fontSize: 8.5,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  giftLabel: {
    width: 50,
  },
  giftContent: {
    flex: 1,
    paddingLeft: 4,
  },

  // Bottom Section
  bottomSection: {
    flexDirection: "row",
    borderTop: `1.5pt solid #000`,
    paddingTop: 6,
    marginBottom: 6,
  },
  leftPayment: {
    width: "30%",
    paddingRight: 6,
  },
  paymentTitle: {
    fontSize: 8,
    marginBottom: 3,
    fontWeight: 'bold',
  },
  checkboxRow: {
    flexDirection: "row",
    marginBottom: 3,
    alignItems: "center",
  },
  checkbox: {
    width: 8,
    height: 8,
    border: `1pt solid #000`,
    marginRight: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  check: {
    fontSize: 6,
  },
  checkLabel: {
    fontSize: 7.5,
  },
  centerSection: {
    width: "40%",
    paddingHorizontal: 6,
  },
  thaiLabel: {
    fontSize: 8,
    marginBottom: 2,
  },
  thaiBox: {
    backgroundColor: "#ffebee",
    padding: 4,
    borderRadius: 1,
  },
  thaiText: {
    color: "#d32f2f",
    fontSize: 8,
  },
  rightSummary: {
    width: "30%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
    fontSize: 8.5,
  },
  summaryLabel: {
    textAlign: "right",
    width: "60%",
  },
  summaryValue: {
    textAlign: "right",
    width: "40%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
    paddingTop: 2,
    borderTop: `1pt solid #000`,
    fontSize: 9.5,
  },

  // Notes
  notes: {
    marginBottom: 5,
    padding: 5,
    backgroundColor: "#fffbf0",
    borderLeft: `2pt solid ${COLOR_ORANGE}`,
    fontSize: 6.5,
  },
  noteTitle: {
    marginBottom: 1,
  },
  noteItem: {
    marginBottom: 1,
    lineHeight: 1.3,
  },

  // Signatures
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  sigBox: {
    width: "30%",
    alignItems: "center",
    minHeight: 90,
  },
  sigTitle: {
    fontSize: 10,
    marginBottom: 50,
  },
  sigLine: {
    borderTop: `1.5pt solid #000`,
    width: "95%",
    marginBottom: 5,
  },
  sigDate: {
    fontSize: 8.5,
    textAlign: "center",
  },
  sigCompany: {
    fontSize: 8.5,
    textAlign: "center",
  },

  // Divider ระหว่างใบ
  pageDivider: {
    borderTop: `1.5pt dashed #aaa`,
    marginVertical: 8,
  },
});