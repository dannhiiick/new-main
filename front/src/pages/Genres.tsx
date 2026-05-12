import './Genres.css';

const genres = [
  { name: 'Фолк / Этно', emoji: 'FE', count: 1250 },
  { name: 'Поп', emoji: 'PP', count: 3400 },
  { name: 'Q-pop', emoji: 'QP', count: 2800 },
  { name: 'Хип-хоп / Рэп', emoji: 'HR', count: 1900 },
  { name: 'R&B', emoji: 'RB', count: 1100 },
  { name: 'Афро-поп', emoji: 'AP', count: 850 },
  { name: 'Рок', emoji: 'RK', count: 1050 },
  { name: 'Инди', emoji: 'IN', count: 1600 },
  { name: 'Электроника', emoji: 'EL', count: 1250 },
  { name: 'Классика', emoji: 'CL', count: 680 }
];

export function GenresPage() {
  return (
    <div className="genres-page">
      <h2>Жанры</h2>
      <div className="genres-grid">
        {genres.map((genre, idx) => (
          <div key={idx} className="genre-card">
            <div className="genre-emoji">{genre.emoji}</div>
            <h4>{genre.name}</h4>
            <p className="genre-count">{genre.count} треков</p>
            <button className="explore-btn">Открыть</button>
          </div>
        ))}
      </div>
    </div>
  );
}
