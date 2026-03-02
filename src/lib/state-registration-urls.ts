/**
 * State Sales Tax Registration URLs (2026)
 * 
 * Direct links to official state tax registration portals.
 * These are the official websites where businesses register to collect sales tax.
 */

export interface StateRegistrationInfo {
  stateCode: string;
  registrationUrl: string;
  portalName: string;
}

/**
 * Official state tax registration URLs
 * Sources: State departments of revenue / taxation websites
 */
export const STATE_REGISTRATION_URLS: Record<string, StateRegistrationInfo> = {
  AL: {
    stateCode: 'AL',
    registrationUrl: 'https://myalabamataxes.alabama.gov/',
    portalName: 'My Alabama Taxes',
  },
  AZ: {
    stateCode: 'AZ',
    registrationUrl: 'https://azdor.gov/transaction-privilege-tax/tpt-license',
    portalName: 'Arizona TPT License',
  },
  AR: {
    stateCode: 'AR',
    registrationUrl: 'https://www.dfa.arkansas.gov/excise-tax/sales-and-use-tax/register-for-sales-tax',
    portalName: 'Arkansas DFA',
  },
  CA: {
    stateCode: 'CA',
    registrationUrl: 'https://www.cdtfa.ca.gov/services/#Register',
    portalName: 'California CDTFA',
  },
  CO: {
    stateCode: 'CO',
    registrationUrl: 'https://mybiz.colorado.gov/registration',
    portalName: 'Colorado MyBiz',
  },
  CT: {
    stateCode: 'CT',
    registrationUrl: 'https://portal.ct.gov/DRS/Sales-Tax/Sales-and-Use-Taxes---Registration',
    portalName: 'Connecticut DRS',
  },
  FL: {
    stateCode: 'FL',
    registrationUrl: 'https://floridarevenue.com/taxes/taxesfees/Pages/sales_tax.aspx',
    portalName: 'Florida DOR',
  },
  GA: {
    stateCode: 'GA',
    registrationUrl: 'https://gtc.dor.ga.gov/',
    portalName: 'Georgia Tax Center',
  },
  HI: {
    stateCode: 'HI',
    registrationUrl: 'https://hitax.hawaii.gov/',
    portalName: 'Hawaii Tax Online',
  },
  ID: {
    stateCode: 'ID',
    registrationUrl: 'https://tax.idaho.gov/i-1023.cfm',
    portalName: 'Idaho Tax Commission',
  },
  IL: {
    stateCode: 'IL',
    registrationUrl: 'https://mytax.illinois.gov/',
    portalName: 'Illinois MyTax',
  },
  IN: {
    stateCode: 'IN',
    registrationUrl: 'https://intime.dor.in.gov/',
    portalName: 'Indiana INTIME',
  },
  IA: {
    stateCode: 'IA',
    registrationUrl: 'https://tax.iowa.gov/business-registration',
    portalName: 'Iowa Tax',
  },
  KS: {
    stateCode: 'KS',
    registrationUrl: 'https://www.ksrevenue.gov/busregistration.html',
    portalName: 'Kansas DOR',
  },
  KY: {
    stateCode: 'KY',
    registrationUrl: 'https://onestop.ky.gov/',
    portalName: 'Kentucky One Stop',
  },
  LA: {
    stateCode: 'LA',
    registrationUrl: 'https://latap.revenue.louisiana.gov/',
    portalName: 'Louisiana LaTAP',
  },
  ME: {
    stateCode: 'ME',
    registrationUrl: 'https://www.maine.gov/revenue/tax-return-forms/sales-use-service-provider-tax/registration',
    portalName: 'Maine Revenue',
  },
  MD: {
    stateCode: 'MD',
    registrationUrl: 'https://interactive.marylandtaxes.gov/Individuals/iFile_ChooseForm/default.asp',
    portalName: 'Maryland Taxes',
  },
  MA: {
    stateCode: 'MA',
    registrationUrl: 'https://www.mass.gov/orgs/massachusetts-department-of-revenue',
    portalName: 'Massachusetts DOR',
  },
  MI: {
    stateCode: 'MI',
    registrationUrl: 'https://mto.treasury.michigan.gov/',
    portalName: 'Michigan Treasury Online',
  },
  MN: {
    stateCode: 'MN',
    registrationUrl: 'https://www.mndor.state.mn.us/tp/eservices/',
    portalName: 'Minnesota e-Services',
  },
  MS: {
    stateCode: 'MS',
    registrationUrl: 'https://tap.dor.ms.gov/',
    portalName: 'Mississippi TAP',
  },
  MO: {
    stateCode: 'MO',
    registrationUrl: 'https://mytax.mo.gov/',
    portalName: 'Missouri MyTax',
  },
  NE: {
    stateCode: 'NE',
    registrationUrl: 'https://revenue.nebraska.gov/businesses/register-business',
    portalName: 'Nebraska Revenue',
  },
  NV: {
    stateCode: 'NV',
    registrationUrl: 'https://tax.nv.gov/',
    portalName: 'Nevada Tax',
  },
  NJ: {
    stateCode: 'NJ',
    registrationUrl: 'https://www.njportal.com/taxation/businessregistration',
    portalName: 'New Jersey Business Registration',
  },
  NM: {
    stateCode: 'NM',
    registrationUrl: 'https://tap.state.nm.us/',
    portalName: 'New Mexico TAP',
  },
  NY: {
    stateCode: 'NY',
    registrationUrl: 'https://www.tax.ny.gov/bus/st/stidx.htm',
    portalName: 'New York Tax',
  },
  NC: {
    stateCode: 'NC',
    registrationUrl: 'https://www.ncdor.gov/taxes-forms/sales-and-use-tax/register-sales-and-use-tax',
    portalName: 'North Carolina DOR',
  },
  ND: {
    stateCode: 'ND',
    registrationUrl: 'https://www.tax.nd.gov/business/sales-use-tax/register-sales-tax-permit',
    portalName: 'North Dakota Tax',
  },
  OH: {
    stateCode: 'OH',
    registrationUrl: 'https://tax.ohio.gov/sales_and_use.aspx',
    portalName: 'Ohio Tax',
  },
  OK: {
    stateCode: 'OK',
    registrationUrl: 'https://oktap.tax.ok.gov/',
    portalName: 'Oklahoma TAP',
  },
  PA: {
    stateCode: 'PA',
    registrationUrl: 'https://www.revenue.pa.gov/Registration/Pages/default.aspx',
    portalName: 'Pennsylvania Revenue',
  },
  RI: {
    stateCode: 'RI',
    registrationUrl: 'https://www.ri.gov/taxation/business/',
    portalName: 'Rhode Island Tax',
  },
  SC: {
    stateCode: 'SC',
    registrationUrl: 'https://dor.sc.gov/tax/sales',
    portalName: 'South Carolina DOR',
  },
  SD: {
    stateCode: 'SD',
    registrationUrl: 'https://dor.sd.gov/businesses/taxes/sales-use-tax/',
    portalName: 'South Dakota DOR',
  },
  TN: {
    stateCode: 'TN',
    registrationUrl: 'https://tntap.tn.gov/',
    portalName: 'Tennessee TNTAP',
  },
  TX: {
    stateCode: 'TX',
    registrationUrl: 'https://comptroller.texas.gov/taxes/permit/',
    portalName: 'Texas Comptroller',
  },
  UT: {
    stateCode: 'UT',
    registrationUrl: 'https://tax.utah.gov/sales',
    portalName: 'Utah Tax Commission',
  },
  VT: {
    stateCode: 'VT',
    registrationUrl: 'https://tax.vermont.gov/business-and-corp/sales-and-use-tax',
    portalName: 'Vermont Tax',
  },
  VA: {
    stateCode: 'VA',
    registrationUrl: 'https://www.tax.virginia.gov/retail-sales-and-use-tax',
    portalName: 'Virginia Tax',
  },
  WA: {
    stateCode: 'WA',
    registrationUrl: 'https://dor.wa.gov/open-business/apply-business-license',
    portalName: 'Washington DOR',
  },
  WV: {
    stateCode: 'WV',
    registrationUrl: 'https://tax.wv.gov/Business/Pages/default.aspx',
    portalName: 'West Virginia Tax',
  },
  WI: {
    stateCode: 'WI',
    registrationUrl: 'https://www.revenue.wi.gov/Pages/Businesses/Sales-Tax.aspx',
    portalName: 'Wisconsin DOR',
  },
  WY: {
    stateCode: 'WY',
    registrationUrl: 'https://excise-wyifs.wy.gov/',
    portalName: 'Wyoming ETS',
  },
  DC: {
    stateCode: 'DC',
    registrationUrl: 'https://otr.cfo.dc.gov/page/register-business-tax',
    portalName: 'DC OTR',
  },
};

/**
 * Get registration URL for a specific state
 */
export function getStateRegistrationUrl(stateCode: string): StateRegistrationInfo | undefined {
  return STATE_REGISTRATION_URLS[stateCode];
}

/**
 * Get all states with registration URLs
 */
export function getAllRegistrationUrls(): StateRegistrationInfo[] {
  return Object.values(STATE_REGISTRATION_URLS);
}
