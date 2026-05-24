export default function DashboardCompetenciesLoading() {
  return (
    <div aria-busy="true" aria-label="Loading competencies">
      <div style={{ marginBottom: 18 }}>
        <div className="skeleton" style={{ width: 220, height: 32, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 300, height: 13 }} />
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="skeleton" style={{ width: 140, height: 32, borderRadius: 10 }} />
          ))}
        </div>

        <div className="table-scroll">
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Activity</th>
                <th>Area</th>
                <th>Evidence</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx}>
                  <td><div className="skeleton" style={{ width: 90, height: 14 }} /></td>
                  <td><div className="skeleton" style={{ width: '90%', height: 14 }} /></td>
                  <td><div className="skeleton" style={{ width: 120, height: 14 }} /></td>
                  <td><div className="skeleton" style={{ width: 96, height: 14 }} /></td>
                  <td><div className="skeleton" style={{ width: 110, height: 14, marginLeft: 'auto' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
