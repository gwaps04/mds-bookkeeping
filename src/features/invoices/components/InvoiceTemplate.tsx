// src/features/invoices/components/InvoiceTemplate.tsx
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register a cleaner font (optional, but makes it look professional)
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
  companyName: { fontSize: 24, fontWeight: 'bold', color: '#000000' },
  invoiceLabel: { fontSize: 20, color: '#737373', textTransform: 'uppercase', letterSpacing: 1 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', color: '#737373', textTransform: 'uppercase', marginBottom: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  table: { width: '100%', marginTop: 20 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e5e5', paddingBottom: 5, marginBottom: 5, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  colDesc: { width: '50%' },
  colQty: { width: '15%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  totalsArea: { marginTop: 20, borderTopWidth: 2, borderTopColor: '#000000', paddingTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 5 },
  totalLabel: { width: '20%', textAlign: 'right', fontWeight: 'bold', paddingRight: 10 },
  totalValue: { width: '20%', textAlign: 'right', fontWeight: 'bold', fontSize: 12 },
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e5e5e5', paddingTop: 10, fontSize: 8, color: '#737373', textAlign: 'center' }
});

export const InvoiceTemplate = ({ invoice, items, business, currency }: any) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency }).format(amount);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{business.business_name}</Text>
          </View>
          <View>
            <Text style={styles.invoiceLabel}>Invoice</Text>
            <Text style={{ textAlign: 'right', marginTop: 5 }}>#{invoice.id.substring(0, 8).toUpperCase()}</Text>
          </View>
        </View>

        {/* BILLING INFO */}
        <View style={styles.row}>
          <View style={{ width: '50%' }}>
            <Text style={styles.sectionTitle}>Billed To:</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 12 }}>{invoice.client_name}</Text>
          </View>
          <View style={{ width: '50%', alignItems: 'flex-end' }}>
            <View style={styles.row}>
              <Text style={{ color: '#737373', width: 60 }}>Date:</Text>
              <Text>{new Date(invoice.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={{ color: '#737373', width: 60 }}>Due Date:</Text>
              <Text style={{ fontWeight: 'bold' }}>{invoice.due_date}</Text>
            </View>
          </View>
        </View>

        {/* LINE ITEMS TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colTotal}>Amount</Text>
          </View>
          
          {items.map((item: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.unit_price)}</Text>
              <Text style={styles.colTotal}>{formatCurrency(item.total_price)}</Text>
            </View>
          ))}
        </View>

        {/* TOTALS */}
        <View style={styles.totalsArea}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Due:</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.total_amount)}</Text>
          </View>
        </View>

        {/* FOOTER / PAYMENT INSTRUCTIONS */}
        <View style={styles.footer}>
          <Text>Please make checks payable to {business.business_name} or send via GCash/Bank Transfer.</Text>
          <Text>Thank you for your business!</Text>
        </View>

      </Page>
    </Document>
  );
};