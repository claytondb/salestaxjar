'use client';

import Link from 'next/link';
import { AlertTriangle, Calendar, Landmark } from 'lucide-react';

interface TaxDisclaimerProps {
  variant?: 'inline' | 'banner' | 'compact';
  className?: string;
}

// Official state tax authority URLs
export const stateTaxAuthorities: Record<string, { name: string; url: string }> = {
  AL: { name: "Alabama DOR", url: "https://revenue.alabama.gov/" },
  AK: { name: "Alaska DOR", url: "https://tax.alaska.gov/" },
  AZ: { name: "Arizona DOR", url: "https://azdor.gov/" },
  AR: { name: "Arkansas DFA", url: "https://www.dfa.arkansas.gov/" },
  CA: { name: "California CDTFA", url: "https://www.cdtfa.ca.gov/" },
  CO: { name: "Colorado DOR", url: "https://tax.colorado.gov/" },
  CT: { name: "Connecticut DRS", url: "https://portal.ct.gov/DRS" },
  DE: { name: "Delaware DOF", url: "https://revenue.delaware.gov/" },
  FL: { name: "Florida DOR", url: "https://floridarevenue.com/" },
  GA: { name: "Georgia DOR", url: "https://dor.georgia.gov/" },
  HI: { name: "Hawaii DOTAX", url: "https://tax.hawaii.gov/" },
  ID: { name: "Idaho Tax Commission", url: "https://tax.idaho.gov/" },
  IL: { name: "Illinois DOR", url: "https://www2.illinois.gov/rev/" },
  IN: { name: "Indiana DOR", url: "https://www.in.gov/dor/" },
  IA: { name: "Iowa DOR", url: "https://tax.iowa.gov/" },
  KS: { name: "Kansas DOR", url: "https://www.ksrevenue.gov/" },
  KY: { name: "Kentucky DOR", url: "https://revenue.ky.gov/" },
  LA: { name: "Louisiana DOR", url: "https://revenue.louisiana.gov/" },
  ME: { name: "Maine Revenue", url: "https://www.maine.gov/revenue/" },
  MD: { name: "Maryland Comptroller", url: "https://www.marylandtaxes.gov/" },
  MA: { name: "Massachusetts DOR", url: "https://www.mass.gov/orgs/massachusetts-department-of-revenue" },
  MI: { name: "Michigan Treasury", url: "https://www.michigan.gov/treasury" },
  MN: { name: "Minnesota DOR", url: "https://www.revenue.state.mn.us/" },
  MS: { name: "Mississippi DOR", url: "https://www.dor.ms.gov/" },
  MO: { name: "Missouri DOR", url: "https://dor.mo.gov/" },
  MT: { name: "Montana DOR", url: "https://mtrevenue.gov/" },
  NE: { name: "Nebraska DOR", url: "https://revenue.nebraska.gov/" },
  NV: { name: "Nevada Tax", url: "https://tax.nv.gov/" },
  NH: { name: "New Hampshire DRA", url: "https://www.revenue.nh.gov/" },
  NJ: { name: "New Jersey Treasury", url: "https://www.state.nj.us/treasury/taxation/" },
  NM: { name: "New Mexico TRD", url: "https://www.tax.newmexico.gov/" },
  NY: { name: "New York Tax", url: "https://www.tax.ny.gov/" },
  NC: { name: "North Carolina DOR", url: "https://www.ncdor.gov/" },
  ND: { name: "North Dakota Tax", url: "https://www.tax.nd.gov/" },
  OH: { name: "Ohio Tax", url: "https://tax.ohio.gov/" },
  OK: { name: "Oklahoma Tax Commission", url: "https://oklahoma.gov/tax.html" },
  OR: { name: "Oregon DOR", url: "https://www.oregon.gov/dor/" },
  PA: { name: "Pennsylvania DOR", url: "https://www.revenue.pa.gov/" },
  RI: { name: "Rhode Island Tax", url: "https://tax.ri.gov/" },
  SC: { name: "South Carolina DOR", url: "https://dor.sc.gov/" },
  SD: { name: "South Dakota DOR", url: "https://dor.sd.gov/" },
  TN: { name: "Tennessee DOR", url: "https://www.tn.gov/revenue.html" },
  TX: { name: "Texas Comptroller", url: "https://comptroller.texas.gov/" },
  UT: { name: "Utah Tax Commission", url: "https://tax.utah.gov/" },
  VT: { name: "Vermont Tax", url: "https://tax.vermont.gov/" },
  VA: { name: "Virginia Tax", url: "https://www.tax.virginia.gov/" },
  WA: { name: "Washington DOR", url: "https://dor.wa.gov/" },
  WV: { name: "West Virginia Tax", url: "https://tax.wv.gov/" },
  WI: { name: "Wisconsin DOR", url: "https://www.revenue.wi.gov/" },
  WY: { name: "Wyoming DOR", url: "https://revenue.wyo.gov/" },
  DC: { name: "DC OTR", url: "https://otr.cfo.dc.gov/" },
};

export default function TaxDisclaimer({ variant = 'inline', className = '' }: TaxDisclaimerProps) {
  if (variant === 'banner') {
    return (
      <div className={`rounded-lg p-4 ${className}`} style={{ backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--warning-text)' }} />
          <div>
            <h4 className="font-semibold mb-1" style={{ color: 'var(--warning-text)' }}>Tax Estimation Disclaimer</h4>
            <p className="text-sm" style={{ color: 'var(--warning-text)' }}>
              The tax rates shown are <strong>estimates only</strong> based on publicly available data. 
              Actual rates may vary based on local jurisdictions (city, county, special districts) and product-specific exemptions. 
              Sails is not a CPA firm or tax advisory service. Always verify rates with your 
              state&apos;s official tax authority and consult a qualified tax professional for advice specific to your business.
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs items-center">
              <span className="flex items-center gap-1" style={{ color: 'var(--warning-text)' }}>
                <Calendar className="w-3 h-3" /> Rates last updated: January 2025
              </span>
              <span style={{ color: 'var(--warning-text)' }}>|</span>
              <Link href="/terms" className="underline hover:opacity-80 font-medium" style={{ color: 'var(--warning-text)' }}>Full Terms of Service →</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`text-xs text-theme-muted flex items-center gap-1 ${className}`}>
        <AlertTriangle className="w-3 h-3 text-theme-accent" /> Rates are estimates. 
        <Link href="/terms" className="text-theme-accent hover:text-emerald-300 ml-1">See disclaimer</Link>.
      </div>
    );
  }

  // Default inline variant
  return (
    <div className={`bg-theme-secondary/30 border border-theme-primary rounded-lg p-3 text-sm text-theme-muted ${className}`}>
      <p className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-theme-accent flex-shrink-0 mt-0.5" />
        <span><span className="text-theme-accent font-medium">Disclaimer:</span> Tax calculations are estimates based on 
        average combined state and local rates. Actual rates may vary. This is not tax advice. 
        <Link href="/terms" className="text-theme-accent hover:text-emerald-300 ml-1">Learn more</Link></span>
      </p>
    </div>
  );
}

// Component to show state authority link
export function StateAuthorityLink({ stateCode, className = '' }: { stateCode: string; className?: string }) {
  const authority = stateTaxAuthorities[stateCode.toUpperCase()];
  
  if (!authority) return null;
  
  return (
    <a 
      href={authority.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`text-theme-accent hover:text-emerald-300 text-sm inline-flex items-center gap-1 ${className}`}
    >
      <Landmark className="w-4 h-4" />
      <span>Verify with {authority.name}</span>
      <span className="text-xs">↗</span>
    </a>
  );
}
