import { useEffect, useState } from 'preact/hooks';
import type { FootballMatch, LeagueTable } from '../lib/football-types';
import FootballMatchDrawer, { type FootballMatchContext } from './FootballMatchDrawer';

interface MatchGroups {
  live: FootballMatch[];
  upcoming: FootballMatch[];
  recent: FootballMatch[];
}

const BOARDS: {
  key: keyof MatchGroups;
  title: string;
  description: string;
  empty: string;
}[] = [
  { key: 'live', title: 'Live now', description: 'Games currently in progress.', empty: 'No live games right now.' },
  { key: 'upcoming', title: 'Upcoming games', description: 'The next scheduled fixtures.', empty: 'No upcoming fixtures in the current data window.' },
  { key: 'recent', title: 'Recent results', description: 'The latest completed games.', empty: 'No recent results are available.' },
];

function timeLabel(utc: string, local: boolean) {
  if (!local) return new Date(utc).toUTCString();
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(utc));
}

function MatchCard({
  match,
  local,
  onOpen,
}: {
  match: FootballMatch;
  local: boolean;
  onOpen: () => void;
}) {
  const score = (side: 'home' | 'away') =>
    match.score ? match.score[side] : match.status === 'live' ? '-' : '';
  return (
    <button
      type="button"
      class="football-match"
      onClick={onOpen}
      aria-label={`${match.home.name} versus ${match.away.name}, open match centre`}
    >
      <div class="football-match-top">
        <span>{match.phase}</span>
        <time dateTime={match.utc}>{timeLabel(match.utc, local)}</time>
      </div>
      <div class="football-match-team">
        {match.home.logo ? <img src={match.home.logo} alt="" /> : <span />}
        <span>{match.home.name}</span>
        <span class="football-match-score">{score('home')}</span>
      </div>
      <div class="football-match-team">
        {match.away.logo ? <img src={match.away.logo} alt="" /> : <span />}
        <span>{match.away.name}</span>
        <span class="football-match-score">{score('away')}</span>
      </div>
      <div class="football-match-meta">
        <span>{match.note || match.venue || (match.status === 'live' ? 'Live now' : match.phase)}</span>
        <strong>Match centre</strong>
      </div>
    </button>
  );
}

export default function FootballMatchBoards({
  groups,
  competition,
  espn,
  tables,
}: {
  groups: MatchGroups;
  competition: string;
  espn: string;
  tables: LeagueTable[];
}) {
  const [selected, setSelected] = useState<FootballMatch | null>(null);
  const [local, setLocal] = useState(false);
  const context: FootballMatchContext = { name: competition, espn, tables };

  useEffect(() => setLocal(true), []);

  return (
    <>
      <div class="match-boards">
        {BOARDS.map((board) => {
          const matches = groups[board.key];
          return (
            <section class={`match-board is-${board.key}`} key={board.key}>
              <div class="competition-section-head">
                <div><h3>{board.title}</h3><p>{board.description}</p></div>
                {board.key === 'live' && matches.length > 0 && <span class="live-indicator">Live</span>}
              </div>
              {matches.length ? (
                <div class="match-strip">
                  {matches.map((match) => (
                    <MatchCard match={match} local={local} onOpen={() => setSelected(match)} key={match.id} />
                  ))}
                </div>
              ) : <div class="empty-panel">{board.empty}</div>}
            </section>
          );
        })}
      </div>
      {selected && <FootballMatchDrawer match={selected} context={context} onClose={() => setSelected(null)} />}
    </>
  );
}
