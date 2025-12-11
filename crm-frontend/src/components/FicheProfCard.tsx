import React from "react";
import type { Professeur } from "@/types/Professeur";

const FicheProfCard: React.FC<Professeur & { actions?: React.ReactNode }> = ({
  photoUrl,
  firstName,
  lastName,
  email,
  phone,
  address,
  dateOfBirth,
  nationality,
  // status,
  // teacherNumber,
  // specialty,
  hireDate,
  courses = [],
  subGroups = [],
  absences = [],
  actions,
}) => {
  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
      <div className="flex gap-6 items-center">
        <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden border-2 border-primary flex items-center justify-center">
          {photoUrl ? (
            <img src={photoUrl} alt="Photo professeur" className="object-cover w-full h-full" />
          ) : (
            <span className="text-5xl text-gray-400">👨‍🏫</span>
          )}
        </div>
        <div className="flex-1">
          <div className="text-2xl font-bold">{firstName || <span className="text-gray-400">(Prénom)</span>} {lastName || <span className="text-gray-400">(Nom)</span>}</div>
          <div className="text-sm text-gray-500">{email || <span className="text-gray-400">(Email)</span>}</div>
        </div>
        {actions}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {phone && <div><b>Téléphone :</b> {phone}</div>}
        {address && <div><b>Adresse :</b> {address}</div>}
        {dateOfBirth && <div><b>Date de naissance :</b> {new Date(dateOfBirth).toLocaleDateString()}</div>}
        {nationality && <div><b>Nationalité :</b> {nationality}</div>}
        {hireDate && <div><b>Date d'embauche :</b> {new Date(hireDate).toLocaleDateString()}</div>}
      </div>
      <div className="border-t pt-4 mt-4">
        <div className="font-semibold mb-2">Cours enseignés</div>
        {courses.length > 0 ? (
          <ul className="list-disc pl-5 text-sm">
            {courses.map((c: { id: string; name: string; code?: string }) => (
              <li key={c.id}>{c.code ? `${c.code} - ` : ""}{c.name}</li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-muted-foreground">Aucun cours assigné</div>
        )}
      </div>
      <div className="border-t pt-4 mt-4">
        <div className="font-semibold mb-2">Groupes/Sous-groupes</div>
        {subGroups.length > 0 ? (
          <ul className="list-disc pl-5 text-sm">
            {subGroups.map((sg: { id: string; code: string; group: { name: string } }) => (
              <li key={sg.id}>{sg.group.name} — {sg.code}</li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-muted-foreground">Aucun groupe assigné</div>
        )}
      </div>
      <div className="border-t pt-4 mt-4">
        <div className="font-semibold mb-2">Absences</div>
        {absences.length > 0 ? (
          <ul className="list-disc pl-5 text-sm">
            {absences.map((a: { id: string; date: string; reason?: string }) => (
              <li key={a.id}>{new Date(a.date).toLocaleDateString()} {a.reason ? `— ${a.reason}` : ""}</li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-muted-foreground">Aucune absence enregistrée</div>
        )}
      </div>
    </div>
  );
};

export default FicheProfCard;
