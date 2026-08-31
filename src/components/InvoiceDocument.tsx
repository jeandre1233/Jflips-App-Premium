import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Register a font if needed, but standard fonts are usually fine
// Font.register({ family: 'Helvetica', src: '...' });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#334155',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottom: '2pt solid #1e4da1',
    paddingBottom: 15,
  },
  logo: {
    width: 140,
    height: 70,
    objectFit: 'contain',
    marginBottom: 10,
  },
  businessInfo: {
    textAlign: 'right',
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e4da1',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  businessSub: {
    fontSize: 8,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  billToSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  clientName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  clientDetail: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  table: {
    width: 'auto',
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottom: '1pt solid #e2e8f0',
    padding: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #f1f5f9',
    padding: 8,
  },
  tableRowAlternate: {
    flexDirection: 'row',
    backgroundColor: '#fcfdfe',
    borderBottom: '0.5pt solid #f1f5f9',
    padding: 8,
  },
  colDate: { width: '20%' },
  colDesc: { width: '60%' },
  colAmount: { width: '20%', textAlign: 'right' },
  headerText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase',
  },
  cellText: {
    fontSize: 9,
  },
  footer: {
    marginTop: 'auto',
    borderTop: '1pt solid #e2e8f0',
    paddingTop: 15,
  },
  bankSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  bankInfo: {
    width: '60%',
  },
  bankLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  bankDetail: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 2,
  },
  totalSection: {
    textAlign: 'right',
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e4da1',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e4da1',
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 8,
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#cbd5e1',
  },
});

interface InvoiceDocumentProps {
  profile: any;
  client: {
    label: string;
    address?: string;
    phone?: string;
  };
  sessions: any[];
  total: number;
  invoiceId: string;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  profile,
  client,
  sessions,
  total,
  invoiceId,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          {profile.logo && <Image src={profile.logo} style={styles.logo} />}
          <Text style={styles.businessSub}>Invoice #{invoiceId}</Text>
        </View>
        <View style={styles.businessInfo}>
          <Text style={styles.businessName}>{profile.businessName}</Text>
          <Text style={styles.businessSub}>Stunting & Tumbling Assistant</Text>
        </View>
      </View>

      {/* Bill To */}
      <View style={styles.billToSection}>
        <Text style={styles.sectionTitle}>Bill To</Text>
        <Text style={styles.clientName}>{client.label}</Text>
        {client.address && <Text style={styles.clientDetail}>{client.address}</Text>}
        {client.phone && <Text style={styles.clientDetail}>{client.phone}</Text>}
      </View>

      {/* Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <View style={styles.colDate}><Text style={styles.headerText}>Date</Text></View>
          <View style={styles.colDesc}><Text style={styles.headerText}>Description</Text></View>
          <View style={styles.colAmount}><Text style={styles.headerText}>Amount</Text></View>
        </View>

        {sessions.map((session, index) => (
          <View key={`inv-sess-${session.id || index}-${index}`} style={index % 2 === 1 ? styles.tableRowAlternate : styles.tableRow} wrap={false}>
            <View style={styles.colDate}>
              <Text style={styles.cellText}>{new Date(session.date).toLocaleDateString()}</Text>
            </View>
            <View style={styles.colDesc}>
              <Text style={styles.cellText}>{session.displayClassName}</Text>
              <Text style={[styles.cellText, { fontSize: 7, color: '#94a3b8', marginTop: 1 }]}>
                {session.targetStudentName}
              </Text>
            </View>
            <View style={styles.colAmount}>
              <Text style={styles.cellText}>R{session.displayPrice.toFixed(2)}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.bankSection}>
          <View style={styles.bankInfo}>
            <Text style={styles.bankLabel}>Banking Details</Text>
            <Text style={styles.bankDetail}>Bank: {profile.bankName}</Text>
            <Text style={styles.bankDetail}>Account: {profile.accountNumber}</Text>
            <Text style={styles.bankDetail}>Branch: {profile.branchCode}</Text>
            <Text style={styles.bankDetail}>Type: {profile.accountType}</Text>
          </View>
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total Amount Due</Text>
            <Text style={styles.totalAmount}>R{total.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
        `Page ${pageNumber} of ${totalPages}`
      )} fixed />
    </Page>
  </Document>
);
