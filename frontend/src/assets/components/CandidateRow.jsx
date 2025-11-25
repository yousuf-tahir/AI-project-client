import React from "react";

const CandidateRow = ({ candidate, onSelect }) => {
  const name = candidate.name || candidate.full_name || "-";
  const email = candidate.email || "-";
  const field = candidate.field || candidate.domain || candidate.category || candidate.position || "-";
  const scoreRaw = candidate.score ?? candidate.match ?? candidate.match_percent ?? candidate.match_percentage ?? candidate.match_score;
  const score = scoreRaw !== undefined && scoreRaw !== null ? scoreRaw : "-";
  const role = candidate.role || "-";

  return (
    <tr>
      <td>{name}</td>
      <td>{email}</td>
      <td>{field}</td>
      <td>{score}</td>
      <td><span className="badge-role">{role}</span></td>
      <td style={{ textAlign: 'right' }}>
        <button className="btn btn-blue btn-sm" onClick={() => onSelect && onSelect(candidate)}>
          <span className="material-icons-outlined" style={{ fontSize:14 }}>visibility</span> View
        </button>
      </td>
    </tr>
  );
};

export default CandidateRow;
