import type { LatLng } from '@/types/dispatchRoute'
import type {
  HospitalDistanceMap,
  ReceivingHospital,
  ReceivingHospitalPatientGroup,
} from '@/types/receivingHospital'

export const RECEIVING_HOSPITALS: readonly ReceivingHospital[] = [
  {
    id: 'chum',
    name: "CHUM - Centre hospitalier de l'Université de Montréal",
    designation: 'Tertiary / Quaternary',
    keyNotes: 'Stroke, transplant, vascular, specialized medicine',
    patientGroup: 'adult',
    routingAddress: '1001 rue Sanguinet, Montréal, QC H2X 3E4',
    position: { lat: 45.511355, lng: -73.556923 },
  },
  {
    id: 'montreal-general',
    name: 'Montreal General Hospital',
    designation: 'Tertiary',
    keyNotes: 'Major adult trauma, neurosurgery, ortho trauma',
    patientGroup: 'adult',
    routingAddress: '1650 Cedar Avenue, Montréal, QC H3G 1A4',
    position: { lat: 45.497461, lng: -73.588338 },
  },
  {
    id: 'muhc-glen',
    name: 'MUHC - McGill University Health Centre (Glen Site)',
    designation: 'Tertiary',
    keyNotes: 'Royal Victoria adult emergency, specialty services',
    patientGroup: 'adult',
    routingAddress: '1001 Décarie Boulevard, Montréal, QC H4A 3J1',
    position: { lat: 45.474016, lng: -73.599951 },
  },
  {
    id: 'jewish-general',
    name: 'Jewish General Hospital',
    designation: 'Secondary',
    keyNotes: 'Stroke, cardiology, oncology, surgery',
    patientGroup: 'adult',
    routingAddress: '3755 Côte-Sainte-Catherine Road, Montréal, QC H3T 1E2',
    position: { lat: 45.496849, lng: -73.630416 },
  },
  {
    id: 'sacre-coeur',
    name: 'Hôpital du Sacré-Coeur-de-Montréal',
    designation: 'Tertiary',
    keyNotes: 'Major trauma, neurosurgery, spinal injuries',
    patientGroup: 'adult',
    routingAddress: '5400 boulevard Gouin Ouest, Montréal, QC H4J 1C5',
    position: { lat: 45.532769, lng: -73.714188 },
  },
  {
    id: 'maisonneuve-rosemont',
    name: 'Hôpital Maisonneuve-Rosemont',
    designation: 'Secondary',
    keyNotes: 'Stroke, neurosurgery, ophthalmology',
    patientGroup: 'adult',
    routingAddress: "5415 boulevard de l'Assomption, Montréal, QC H1T 2M4",
    position: { lat: 45.574846, lng: -73.559653 },
  },
  {
    id: 'jean-talon',
    name: 'Hôpital Jean-Talon',
    designation: 'Secondary',
    keyNotes: 'General emergency, medicine, surgery',
    patientGroup: 'adult',
    routingAddress: '1385 rue Jean-Talon Est, Montréal, QC H2E 1S6',
    position: { lat: 45.545943, lng: -73.609507 },
  },
  {
    id: 'st-marys',
    name: "St. Mary's Hospital",
    designation: 'Primary',
    keyNotes: 'General emergency, medicine, obstetrics',
    patientGroup: 'adult',
    routingAddress: '3830 Lacombe Avenue, Montréal, QC H3T 1M5',
    position: { lat: 45.49502, lng: -73.623835 },
  },
  {
    id: 'lakeshore-general',
    name: 'Lakeshore General Hospital',
    designation: 'Primary',
    keyNotes: 'Main West Island receiving hospital',
    patientGroup: 'adult',
    routingAddress: '160 Stillview Avenue, Pointe-Claire, QC H9R 2Y2',
    position: { lat: 45.449046, lng: -73.833391 },
  },
  {
    id: 'notre-dame',
    name: 'Hôpital Notre-Dame',
    designation: 'Primary',
    keyNotes: 'General emergency, medicine',
    patientGroup: 'adult',
    routingAddress: '1560 rue Sherbrooke Est, Montréal, QC H2L 4M1',
    position: { lat: 45.526143, lng: -73.563429 },
  },
  {
    id: 'lachine',
    name: 'Hôpital de Lachine',
    designation: 'Primary',
    keyNotes: 'Community emergency department',
    patientGroup: 'adult',
    routingAddress: '650 16e Avenue, Lachine, QC H8S 3N5',
    position: { lat: 45.441009, lng: -73.676958 },
  },
  {
    id: 'lasalle',
    name: 'Hôpital de LaSalle',
    designation: 'Primary',
    keyNotes: 'Community emergency department',
    patientGroup: 'adult',
    routingAddress: '8585 terrasse Champlain, LaSalle, QC H8P 1C1',
    position: { lat: 45.420725, lng: -73.623297 },
  },
  {
    id: 'verdun',
    name: 'Hôpital de Verdun',
    designation: 'Primary',
    keyNotes: 'Community emergency department',
    patientGroup: 'adult',
    routingAddress: '4000 boulevard LaSalle, Montréal, QC H4G 2A3',
    position: { lat: 45.463701, lng: -73.563493 },
  },
  {
    id: 'montreal-heart-institute',
    name: 'Institut de Cardiologie de Montréal',
    designation: 'Tertiary Specialty',
    keyNotes: 'STEMI / cardiac centre',
    patientGroup: 'adult',
    routingAddress: '5000 rue Bélanger, Montréal, QC H1T 1C8',
    position: { lat: 45.573864, lng: -73.57812 },
  },
  {
    id: 'pierre-boucher',
    name: 'Hôpital Pierre-Boucher',
    designation: 'Secondary',
    keyNotes: 'South Shore referral centre',
    patientGroup: 'adult',
    routingAddress: '1333 boulevard Jacques-Cartier Est, Longueuil, QC J4M 2A5',
    position: { lat: 45.537731, lng: -73.459113 },
  },
  {
    id: 'charles-le-moyne',
    name: 'Hôpital Charles-Le Moyne',
    designation: 'Tertiary',
    keyNotes: 'South Shore tertiary centre',
    patientGroup: 'adult',
    routingAddress: '3120 boulevard Taschereau, Greenfield Park, QC J4V 2H1',
    position: { lat: 45.496969, lng: -73.486574 },
  },
  {
    id: 'sainte-justine',
    name: 'CHU Sainte-Justine',
    designation: 'Tertiary Pediatric',
    keyNotes: 'Pediatrics, NICU, maternal-fetal medicine',
    patientGroup: 'pediatric',
    routingAddress: '3175 chemin de la Côte-Sainte-Catherine, Montréal, QC H3T 1C5',
    position: { lat: 45.502987, lng: -73.624954 },
  },
  {
    id: 'montreal-childrens',
    name: "Montreal Children's Hospital",
    designation: 'Tertiary Pediatric',
    keyNotes: 'Pediatric trauma, surgery, PICU',
    patientGroup: 'pediatric',
    routingAddress: '1001 Décarie Boulevard, Montréal, QC H4A 3J1',
    position: { lat: 45.474016, lng: -73.599951 },
  },
] as const

export function getReceivingHospital(id: string | null): ReceivingHospital | null {
  if (!id) return null
  return RECEIVING_HOSPITALS.find((hospital) => hospital.id === id) ?? null
}

export function hospitalsForGroup(
  patientGroup: ReceivingHospitalPatientGroup,
): ReceivingHospital[] {
  return RECEIVING_HOSPITALS.filter((hospital) => hospital.patientGroup === patientGroup)
}

export function sortHospitalsByDrivingDistance(
  hospitals: readonly ReceivingHospital[],
  distances: HospitalDistanceMap,
): ReceivingHospital[] {
  return hospitals
    .map((hospital, index) => ({ hospital, index }))
    .sort((left, right) => {
      const leftDistance = distances[left.hospital.id]
      const rightDistance = distances[right.hospital.id]
      if (leftDistance === null || leftDistance === undefined) {
        return rightDistance === null || rightDistance === undefined ? left.index - right.index : 1
      }
      if (rightDistance === null || rightDistance === undefined) return -1
      return leftDistance - rightDistance || left.index - right.index
    })
    .map(({ hospital }) => hospital)
}

export function hospitalDisplayPosition(hospital: ReceivingHospital): LatLng {
  if (hospital.id === 'muhc-glen') {
    return { lat: hospital.position.lat + 0.00045, lng: hospital.position.lng - 0.00045 }
  }
  if (hospital.id === 'montreal-childrens') {
    return { lat: hospital.position.lat - 0.00045, lng: hospital.position.lng + 0.00045 }
  }
  return hospital.position
}
