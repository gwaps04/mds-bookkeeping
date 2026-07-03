// src/features/invoices/components/InvoiceTemplate.tsx
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyCg4QxlF.ttf' },
    { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyCg4TYlF.ttf', fontWeight: 'bold' }
  ]
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#171717' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  companyName: { fontSize: 20, fontWeight: 'bold', color: '#000000' },
  invoiceLabel: { fontSize: 24, fontWeight: 'bold', color: '#171717', textTransform: 'uppercase', letterSpacing: 2 }, // Increased tracking to match web!
  
  // Tag Styles
  tagContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  tag: { fontSize: 8, fontWeight: 'bold', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 10, textTransform: 'uppercase' },
  tagPaid: { backgroundColor: '#dcfce7', color: '#15803d' },
  tagOverpaid: { backgroundColor: '#f3e8ff', color: '#6b21a8' },
  tagPartial: { backgroundColor: '#dbeafe', color: '#1d4ed8' },

  sectionTitle: { fontSize: 9, fontWeight: 'bold', color: '#737373', textTransform: 'uppercase', marginBottom: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  
  // Table Styles
  table: { width: '100%', marginTop: 20 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#171717', paddingBottom: 5, marginBottom: 5, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  colDesc: { width: '50%' },
  colQty: { width: '15%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  
  // Bottom Split Section (History & Totals)
  bottomSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, borderTopWidth: 1, borderTopColor: '#e5e5e5', paddingTop: 20 },
  
  // History Styles
  historyContainer: { width: '45%' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  historyText: { fontSize: 9, color: '#737373' },
  historyPos: { fontSize: 9, fontWeight: 'bold', color: '#16a34a' }, // Tailwind green-600
  historyNeg: { fontSize: 9, fontWeight: 'bold', color: '#ea580c' }, // Tailwind orange-600
  
  // Totals Styles
  totalsContainer: { width: '45%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { color: '#737373' },
  totalValue: { fontWeight: 'bold' },
  totalPaidValue: { fontWeight: 'bold', color: '#16a34a' },
  totalRefundValue: { fontWeight: 'bold', color: '#ea580c' },
  
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: '#171717' },
  balanceLabel: { fontSize: 14, fontWeight: 'bold' },
  balanceValue: { fontSize: 14, fontWeight: 'bold' },
  overpaidValue: { fontSize: 14, fontWeight: 'bold', color: '#581c87' }, // Tailwind purple-900

  footer: { position: 'absolute', bottom: 40, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e5e5e5', paddingTop: 10, fontSize: 8, color: '#737373', textAlign: 'center' }
});

export const InvoiceTemplate = ({ invoice, items, business, currency, payments = [], refunds = [] }: any) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  // 1. PDF MATHEMATICAL RECONCILIATION
  const totalDue = Number(invoice.total_amount) || 0;
  const totalPayments = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const approvedRefunds = refunds.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
  
  const netPaid = totalPayments - approvedRefunds;
  const remainingBalance = Math.max(0, totalDue - netPaid);
  const overpaymentAmount = Math.max(0, netPaid - totalDue);
  
  const isFullyPaid = remainingBalance === 0 && overpaymentAmount === 0;
  const isOverpaid = overpaymentAmount > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.invoiceLabel}>INVOICE</Text>
            
            {/* INJECT DYNAMIC STATUS TAG */}
            <View style={styles.tagContainer}>
              {isOverpaid ? (
                <Text style={[styles.tag, styles.tagOverpaid]}>OVERPAID</Text>
              ) : isFullyPaid ? (
                <Text style={[styles.tag, styles.tagPaid]}>FULLY PAID</Text>
              ) : netPaid > 0 ? (
                <Text style={[styles.tag, styles.tagPartial]}>PARTIALLY PAID</Text>
              ) : null}
            </View>
          </View>
          
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.companyName}>{business.business_name}</Text>
            <Text style={{ color: '#737373', marginTop: 5 }}>#{invoice.id.substring(0, 8).toUpperCase()}</Text>
          </View>
        </View>

        {/* BILLING INFO */}
        <View style={styles.row}>
          <View style={{ width: '50%' }}>
            <Text style={styles.sectionTitle}>Billed To</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 14, color: '#171717' }}>{invoice.client_name}</Text>
          </View>
          <View style={{ width: '50%', alignItems: 'flex-end' }}>
            <View style={styles.row}>
              <Text style={{ color: '#737373', width: 60, textAlign: 'right' }}>Date:</Text>
              <Text style={{ width: 80, textAlign: 'right' }}>{new Date(invoice.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={{ color: '#dc2626', width: 60, textAlign: 'right', fontWeight: 'bold' }}>Due Date:</Text>
              <Text style={{ width: 80, textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>{new Date(invoice.due_date).toLocaleDateString()}</Text>
            </View>
          </View>
        </View>

        {/* LINE ITEMS TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Price</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          
          {items.map((item: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>P{formatCurrency(Number(item.unit_price))}</Text>
              <Text style={styles.colTotal}>P{formatCurrency(Number(item.total_price))}</Text>
            </View>
          ))}
        </View>

        {/* BOTTOM SPLIT: HISTORY & TOTALS */}
        <View style={styles.bottomSection}>
          
          {/* LEFT: PAYMENT HISTORY */}
          <View style={styles.historyContainer}>
            {(payments.length > 0 || refunds.length > 0) && (
              <>
                <Text style={styles.sectionTitle}>Payment History</Text>
                
                {payments.map((p: any, i: number) => (
                  <View key={`p-${i}`} style={styles.historyRow}>
                    <Text style={styles.historyText}>Received on {new Date(p.date).toLocaleDateString()}</Text>
                    <Text style={styles.historyPos}>P{formatCurrency(Number(p.amount))}</Text>
                  </View>
                ))}
                
                {refunds.map((r: any, i: number) => (
                  <View key={`r-${i}`} style={styles.historyRow}>
                    <Text style={styles.historyText}>Refunded on {new Date(r.created_at).toLocaleDateString()}</Text>
                    <Text style={styles.historyNeg}>- P{formatCurrency(Number(r.amount))}</Text>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* RIGHT: ACCOUNTING TOTALS */}
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>P{formatCurrency(totalDue)}</Text>
            </View>
            
            {totalPayments > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Paid</Text>
                <Text style={styles.totalPaidValue}>- P{formatCurrency(totalPayments)}</Text>
              </View>
            )}
            
            {approvedRefunds > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Refunded</Text>
                <Text style={styles.totalRefundValue}>+ P{formatCurrency(approvedRefunds)}</Text>
              </View>
            )}

            {/* DYNAMIC BALANCE RENDER */}
            {isOverpaid ? (
              <View style={styles.balanceRow}>
                <Text style={[styles.balanceLabel, { color: '#581c87' }]}>Overpayment</Text>
                <Text style={styles.overpaidValue}>P{formatCurrency(overpaymentAmount)}</Text>
              </View>
            ) : (
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Balance Due</Text>
                <Text style={styles.balanceValue}>P{formatCurrency(remainingBalance)}</Text>
              </View>
            )}
          </View>
          
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text>Please make checks payable to {business.business_name} or send via GCash/Bank Transfer.</Text>
          <Text>Thank you for your business!</Text>
        </View>

      </Page>
    </Document>
  );
};