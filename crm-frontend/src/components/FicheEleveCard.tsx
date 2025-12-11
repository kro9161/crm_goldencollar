
export interface Filiere {
  label?: string;
  code?: string;
  color?: string;
  level?: string;
}

export interface Paiement {
  id: string;
  amount: number;
  status: string;
  dueDate?: string;
  paidAt?: string;
}

export interface Absence {
  id: string;
  status: string;
  justified?: boolean;
  reason?: string;
  session?: {
    course?: { name?: string };
    startTime?: string;
  };
}

export interface Note {
  id: string;
  valeur: number;
  commentaire?: string;
  course?: { name?: string };
}

export interface FicheEleveCardProps {
  photoUrl?: string;
  nom: string;
  prenom: string;
  filiere?: Filiere;
  filiereList?: Filiere[];
  niveau?: string;
  session?: string;
  statut?: string;
  numeroEtudiant?: string;
  dateNaissance?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  genre?: string;
  nationalite?: string;
  responsableNom?: string;
  responsableTel?: string;
  inscription?: string;
  badges?: string[];
  actions?: React.ReactNode;
  boursier?: boolean;
  handicap?: boolean;
  sousGroupe?: string;
  paiements?: Paiement[];
  absences?: Absence[];
  notes?: Note[];
}

import React from "react";

export interface Filiere {
  label?: string;
  code?: string;
  color?: string;
  level?: string;
}

export interface FicheEleveCardProps {
  photoUrl?: string;
  nom: string;
  prenom: string;
  filiere?: Filiere;
  filiereList?: Filiere[];
  niveau?: string;
  session?: string;
  statut?: string;
  numeroEtudiant?: string;
  dateNaissance?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  genre?: string;
  nationalite?: string;
  responsableNom?: string;
  responsableTel?: string;
  inscription?: string;
  badges?: string[];
  actions?: React.ReactNode;
  boursier?: boolean;
  handicap?: boolean;
  sousGroupe?: string;
}

export default function FicheEleveCard(props: FicheEleveCardProps) {
  const {
    photoUrl,
    nom,
    prenom,
    filiere,
    niveau,
    session,
    statut,
    numeroEtudiant,
    dateNaissance,
    email,
    telephone,
    adresse,
    genre,
    nationalite,
    filiereList = [],
    boursier,
    handicap,
    sousGroupe,
    responsableNom,
    responsableTel,
    inscription,
    badges = [],
    actions,
    paiements = [],
    absences = [],
    notes = [],
  } = props;
  // ...déstructuration terminée, on peut retourner le JSX
  return (
    <div className="relative max-w-xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-6 border border-gray-100">
      {/* Avatar */}
      <div className="relative -mt-20 mb-2">
        <div
          className="w-36 h-36 rounded-full border-8 shadow-lg flex items-center justify-center"
          style={{
            borderColor: filiere?.color || "#60a5fa",
            background:
              "linear-gradient(135deg, " + (filiere?.color || "#60a5fa") + " 60%, #f3f4f6 100%)",
          }}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={prenom + " " + nom}
              className="w-32 h-32 object-cover rounded-full border-4 border-white shadow"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-4xl text-gray-400">
              {prenom[0]}
            </div>
          )}
        </div>
      </div>
      {/* Nom & Filière */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">
          {prenom} {nom}
        </h2>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span
            className="px-3 py-1 rounded-full text-white text-sm font-semibold shadow"
            style={{ background: filiere?.color || "#60a5fa" }}
          >
            {filiere?.label}
          </span>
          {niveau && (
            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
              {niveau}
            </span>
          )}
          {session && (
            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
              {session}
            </span>
          )}
        </div>
      </div>
      {/* Infos principales */}
      <div className="grid grid-cols-2 gap-4 w-full mt-4">
        {numeroEtudiant && (
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">Numéro étudiant</span>
            <span className="font-semibold text-gray-700">{numeroEtudiant}</span>
          </div>
        )}
        {dateNaissance && (
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">Date de naissance</span>
            <span className="font-semibold text-gray-700">{dateNaissance}</span>
          </div>
        )}
        {email && (
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">Email</span>
            <span className="font-semibold text-gray-700">{email}</span>
          </div>
        )}
        {telephone && (
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">Téléphone</span>
            <span className="font-semibold text-gray-700">{telephone}</span>
          </div>
        )}
        {adresse && (
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">Adresse</span>
            <span className="font-semibold text-gray-700">{adresse}</span>
          </div>
        )}
        {genre && (
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">Genre</span>
            <span className="font-semibold text-gray-700">{genre}</span>
          </div>
        )}
        {nationalite && (
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">Nationalité</span>
            <span className="font-semibold text-gray-700">{nationalite}</span>
          </div>
        )}
        {responsableNom && (
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">Responsable légal</span>
            <span className="font-semibold text-gray-700">{responsableNom}</span>
          </div>
        )}
        {responsableTel && (
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">Téléphone responsable</span>
            <span className="font-semibold text-gray-700">{responsableTel}</span>
          </div>
        )}
        {inscription && (
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">Date d'inscription</span>
            <span className="font-semibold text-gray-700">{inscription}</span>
          </div>
        )}
      </div>
      {/* Statut & Badges */}
      {/* Ajout filières, statuts et sous-groupe */}
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {/* Toutes les filières */}
        {filiereList && filiereList.length > 0 && filiereList.map((f: Filiere, idx: number) => (
          <span key={idx} className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
            {f.label || f.code}
          </span>
        ))}
        {/* Statuts */}
        {(boursier || handicap) && (
          <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
            {boursier && "Boursier"}
            {boursier && handicap && " / "}
            {handicap && "Handicap"}
          </span>
        )}
        {/* Sous-groupe */}
        {sousGroupe && (
          <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
            Sous-groupe : {sousGroupe}
          </span>
        )}
        {/* Statut principal */}
        {statut && (
          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
            {statut}
          </span>
        )}
        {/* Badges */}
        {badges.map((b, i) => (
          <span
            key={i}
            className="px-3 py-1 rounded-full bg-gray-200 text-gray-700 text-xs font-medium"
          >
            {b}
          </span>
        ))}
      </div>
      {/* Actions */}
      {actions && <div className="mt-6 flex gap-3">{actions}</div>}

      {/* Section Paiements */}
      {paiements.length > 0 && (
        <section className="w-full mt-8">
          <h3 className="text-lg font-bold mb-2">Paiements</h3>
          <ul className="space-y-1">
            {paiements.map((p) => (
              <li key={p.id} className="flex justify-between items-center border-b py-1">
                <span>{p.amount}€</span>
                <span>{p.status}</span>
                <span>{p.dueDate ? new Date(p.dueDate).toLocaleDateString() : ""}</span>
                {p.paidAt && <span className="text-green-600">Payé le {new Date(p.paidAt).toLocaleDateString()}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Section Absences */}
      {absences.length > 0 && (
        <section className="w-full mt-8">
          <h3 className="text-lg font-bold mb-2">Absences</h3>
          <ul className="space-y-1">
            {absences.map((a) => (
              <li key={a.id} className="flex justify-between items-center border-b py-1">
                <span>{a.session?.course?.name}</span>
                <span>{a.session?.startTime ? new Date(a.session.startTime).toLocaleDateString() : ""}</span>
                <span>{a.status}</span>
                {a.justified && <span className="text-blue-600">(justifiée)</span>}
                {a.reason && <span className="text-gray-500">{a.reason}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Section Notes */}
      {notes.length > 0 && (
        <section className="w-full mt-8">
          <h3 className="text-lg font-bold mb-2">Notes</h3>
          <ul className="space-y-1">
            {notes.map((n) => (
              <li key={n.id} className="flex justify-between items-center border-b py-1">
                <span>{n.course?.name}</span>
                <span>{n.valeur}</span>
                {n.commentaire && <span className="text-gray-500">{n.commentaire}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
