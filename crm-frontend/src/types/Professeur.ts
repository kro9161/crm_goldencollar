export interface Professeur {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  nationality?: string;
  status?: "actif" | "inactif" | "archivé";
  photoUrl?: string;
  teacherNumber?: string;
  specialty?: string;
  hireDate?: string;
  courses?: { id: string; name: string; code?: string }[];
  subGroups?: { id: string; code: string; group: { name: string } }[];
  absences?: { id: string; date: string; reason?: string }[];
}