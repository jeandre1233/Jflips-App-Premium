import React from 'react';

/**
 * THE INVOICE, AS A PARENT RECEIVES IT.
 * The same sheet the Accounts screen produces each month (A4 width, 15 rows a page,
 * logo, billing period, billed-to, line table, banking details, big total), drawn from
 * data instead of the live month, so an archived invoice can be viewed, downloaded
 * and sent again exactly as it was.
 *
 * Always drawn on white: it is a document, and it is exported as one.
 */

export interface InvoiceSheetLine {
  date: string;
  title: string;
  sub?: string;
  amount: number;
}

export interface InvoiceSheetProps {
  periodLabel: string;
  billedTo: string;
  address?: string | null;
  phone?: string | null;
  lines: InvoiceSheetLine[];
  total: number;
  bank: { bankName?: string; accountNumber?: string; branchCode?: string; accountType?: string };
  generatedOn?: Date;
}

export const SHEET_WIDTH = 794;
const MAX_ROWS_PER_PAGE = 15;

const fmtDate = (d: string) => {
  const t = new Date(d);
  return isNaN(t.getTime()) ? d : t.toLocaleDateString('en-GB');
};

export const InvoiceSheet = React.forwardRef<HTMLDivElement, InvoiceSheetProps>(
  ({ periodLabel, billedTo, address, phone, lines, total, bank, generatedOn }, ref) => {
    const chunks: InvoiceSheetLine[][] = [];
    for (let i = 0; i < lines.length; i += MAX_ROWS_PER_PAGE) chunks.push(lines.slice(i, i + MAX_ROWS_PER_PAGE));
    if (chunks.length === 0) chunks.push([]);

    const bankRows: [string, string | undefined][] = [
      ['Bank', bank.bankName], ['Account', bank.accountNumber], ['Branch', bank.branchCode], ['Type', bank.accountType]
    ];

    return (
      <div ref={ref} style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
        {chunks.map((chunk, pageIdx) => {
          const first = pageIdx === 0;
          const last = pageIdx === chunks.length - 1;
          return (
            <div
              key={pageIdx}
              data-invoice-page
              style={{ width: SHEET_WIDTH, minHeight: last ? undefined : 1123, padding: '48px 56px', position: 'relative', background: '#ffffff', boxSizing: 'border-box' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: '#1e4da1' }} />

              {first ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                    <div>
                      <img src="/Invoice.png" alt="JFLIPS" style={{ height: 72, objectFit: 'contain', borderRadius: 12, marginBottom: 12, display: 'block' }}
                        onError={e => { (e.target as HTMLElement).style.display = 'none'; }} />
                      <p style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#94a3b8', margin: 0 }}>Tax Invoice / Account</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#94a3b8', margin: '0 0 4px' }}>Billing Period</p>
                      <p style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>{periodLabel}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: 700 }}>
                        Generated {(generatedOn || new Date()).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>

                  <div style={{ height: 1, background: '#e2e8f0', marginBottom: 24 }} />

                  <div style={{ marginBottom: 32 }}>
                    <p style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#1e4da1', margin: '0 0 8px' }}>Billed To</p>
                    <p style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', color: '#0f172a', margin: 0 }}>{billedTo}</p>
                    {address && <p style={{ fontSize: 11, color: '#64748b', marginTop: 4, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{address}</p>}
                    {phone && <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{phone}</p>}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>JFLIPS — {billedTo}</p>
                  <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', margin: 0 }}>{periodLabel} · Page {pageIdx + 1}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px', gap: 12, padding: '0 8px', marginBottom: 8 }}>
                {['Date', 'Description', 'Amount'].map((h, i) => (
                  <span key={h} style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: i === 2 ? 'right' : 'left' }}>{h}</span>
                ))}
              </div>
              <div style={{ height: 2, background: '#0f172a', marginBottom: 8 }} />

              {chunk.length > 0 ? chunk.map((l, idx) => {
                const globalIdx = pageIdx * MAX_ROWS_PER_PAGE + idx;
                return (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px', gap: 12, alignItems: 'flex-start', padding: '12px 8px', background: globalIdx % 2 === 0 ? '#f8fafc' : '#ffffff', borderRadius: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', paddingTop: 2, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(l.date)}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', fontStyle: 'italic', lineHeight: 1.25, margin: 0 }}>{l.title}</p>
                      {l.sub && <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginTop: 2 }}>{l.sub}</p>}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>R{Number(l.amount || 0).toFixed(2)}</span>
                  </div>
                );
              }) : (
                <div style={{ padding: '32px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase' }}>No billed line items</p>
                </div>
              )}

              {last && (
                <>
                  <div style={{ height: 1, background: '#e2e8f0', margin: '16px 0 24px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#1e4da1', margin: '0 0 8px' }}>Banking Details (EFT)</p>
                      {bankRows.map(([label, value]) => value ? (
                        <div key={label} style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', width: 64 }}>{label}</span>
                          <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: '#334155' }}>{value}</span>
                        </div>
                      ) : null)}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#94a3b8', margin: '0 0 4px' }}>Total Due</p>
                      <p style={{ fontSize: 48, fontWeight: 900, fontStyle: 'italic', color: '#1e4da1', lineHeight: 1, margin: 0, fontVariantNumeric: 'tabular-nums' }}>R{Number(total || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div style={{ height: 1, background: '#f1f5f9', margin: '32px 0 12px' }} />
                  <p style={{ fontSize: 9, color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.1em', margin: 0 }}>Generated by JFLIPS Gymnastics</p>
                </>
              )}

              {!last && (
                <div style={{ position: 'absolute', bottom: 24, right: 56 }}>
                  <p style={{ fontSize: 8, color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Page {pageIdx + 1} of {chunks.length}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
);
InvoiceSheet.displayName = 'InvoiceSheet';
