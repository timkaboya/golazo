import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type {
  FootballMatch,
  LeagueTable,
} from '../lib/football-types';
import type {
  FormGame,
  LineupPlayer,
  MatchDetail,
  MatchEvent,
  TeamLineup,
} from '../lib/types';
import { fetchFootballMatchDetail } from '../lib/api';
import { selectRelevantTable } from '../lib/football-stats';

export interface FootballMatchContext {
  name: string;
  espn: string;
  tables: LeagueTable[];
}

type TabId = 'overview' | 'lineup' | 'table' | 'stats' | 'h2h';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'lineup', label: 'Lineup' },
  { id: 'table', label: 'Table' },
  { id: 'stats', label: 'Stats' },
  { id: 'h2h', label: 'Head to head' },
];

const EVENT_LABEL: Record<MatchEvent['type'], string> = {
  goal: 'Goal',
  yellow: 'Yellow card',
  red: 'Red card',
  sub: 'Substitution',
  other: 'Event',
};

function formatKickoff(utc: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(utc));
}

function formationLines(lineup: TeamLineup): LineupPlayer[][] {
  const sizes = lineup.formation
    ?.split('-')
    .map(Number)
    .filter((size) => Number.isFinite(size) && size > 0);
  if (
    sizes &&
    lineup.starters.length === sizes.reduce((total, size) => total + size, 1)
  ) {
    const lines: LineupPlayer[][] = [];
    let offset = 0;
    for (const size of [1, ...sizes]) {
      lines.push(lineup.starters.slice(offset, offset + size));
      offset += size;
    }
    return lines;
  }

  const groups: Record<string, LineupPlayer[]> = { G: [], D: [], M: [], F: [] };
  for (const player of lineup.starters) {
    const group = groups[player.pos.charAt(0)] ?? groups.M;
    group.push(player);
  }
  return ['G', 'D', 'M', 'F'].map((key) => groups[key]).filter((line) => line.length);
}

function TeamBadge({ logo, name }: { logo?: string; name: string }) {
  return logo ? <img src={logo} alt="" /> : <span>{name.slice(0, 3).toUpperCase()}</span>;
}

function PitchPlayer({ player }: { player: LineupPlayer }) {
  const surname = player.name.split(' ').at(-1) || player.name;
  return (
    <div class="fmd-player" title={player.name}>
      <span>{player.num || '-'}</span>
      <strong>{surname}</strong>
    </div>
  );
}

function Pitch({ home, away }: { home: TeamLineup; away: TeamLineup }) {
  const awayLines = formationLines(away);
  const homeLines = formationLines(home).reverse();
  return (
    <div class="fmd-pitch" aria-label="Players arranged by formation">
      <div class="fmd-pitch-half">
        {awayLines.map((line, index) => (
          <div class="fmd-pitch-line" key={`away-${index}`}>
            {line.map((player) => <PitchPlayer player={player} key={`${player.num}-${player.name}`} />)}
          </div>
        ))}
      </div>
      <div class="fmd-halfway" aria-hidden="true"><span /></div>
      <div class="fmd-pitch-half">
        {homeLines.map((line, index) => (
          <div class="fmd-pitch-line" key={`home-${index}`}>
            {line.map((player) => <PitchPlayer player={player} key={`${player.num}-${player.name}`} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function Substitutes({ team, lineup }: { team: string; lineup: TeamLineup }) {
  if (!lineup.subs.length) return null;
  return (
    <div class="fmd-subs">
      <strong>{team} substitutes</strong>
      {lineup.subs.map((player) => (
        <span key={`${player.num}-${player.name}`}>
          <b>{player.num || '-'}</b> {player.name}
        </span>
      ))}
    </div>
  );
}

function EmptyDetail({ children }: { children: string }) {
  return <div class="fmd-empty">{children}</div>;
}

function FormList({ title, games }: { title: string; games: FormGame[] }) {
  return (
    <div class="fmd-form">
      <h4>{title}</h4>
      {games.map((game, index) => (
        <div class="fmd-form-row" key={`${game.date}-${index}`}>
          <span class={`fmd-form-pill is-${game.result.toLowerCase() || 'na'}`}>
            {game.result || '-'}
          </span>
          <span>{game.opponent}</span>
          <strong>{game.score}</strong>
          <small>{game.competition}</small>
        </div>
      ))}
    </div>
  );
}

export default function FootballMatchDrawer({
  match,
  context,
  onClose,
}: {
  match: FootballMatch;
  context: FootballMatchContext;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<TabId>('overview');
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const relevantTable = useMemo(
    () => selectRelevantTable(context.tables, match.home.id, match.away.id),
    [context.tables, match.home.id, match.away.id]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setDetail(null);
    setTab('overview');
    fetchFootballMatchDetail(match.id, context.espn).then((result) => {
      if (!active) return;
      setDetail(result);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [context.espn, match.id]);

  const score = detail?.score ?? match.score;
  const status = detail?.status ?? match.status;
  const showScore = (status === 'live' || status === 'finished') && score;

  return (
    <div class="fmd-overlay" onClick={onClose}>
      <div
        class="fmd-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${match.home.name} versus ${match.away.name}`}
        tabIndex={-1}
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" class="fmd-close" aria-label="Close match centre" onClick={onClose}>
          x
        </button>
        <header class="fmd-header">
          <div class="fmd-kicker">{context.name} / {match.phase}</div>
          <div class="fmd-scoreboard">
            <div class="fmd-team">
              <TeamBadge logo={match.home.logo} name={match.home.name} />
              <strong>{match.home.name}</strong>
            </div>
            <div class="fmd-score">
              {showScore ? `${score.home} - ${score.away}` : 'vs'}
              <small class={`is-${status}`}>
                {status === 'live' ? detail?.clock || 'Live' : status === 'finished' ? 'Full time' : formatKickoff(match.utc)}
              </small>
            </div>
            <div class="fmd-team is-away">
              <TeamBadge logo={match.away.logo} name={match.away.name} />
              <strong>{match.away.name}</strong>
            </div>
          </div>
          <div class="fmd-match-meta">
            <span>{detail?.info.venue || match.venue || 'Venue to be confirmed'}</span>
            {match.note && <span>{match.note}</span>}
          </div>
        </header>

        <div class="fmd-tabs" role="tablist" aria-label="Match views">
          {TABS.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              class={tab === item.id ? 'is-active' : ''}
              onClick={() => setTab(item.id)}
              key={item.id}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div class="fmd-body">
          {loading ? (
            <div class="fmd-loading"><span /> Loading match data...</div>
          ) : (
            <>
              {tab === 'overview' && (
                <div class="fmd-pane">
                  {detail?.events?.length ? (
                    <div class="fmd-timeline">
                      {detail.events.map((event, index) => (
                        <div class={`fmd-event is-${event.side || 'neutral'}`} key={`${event.min}-${index}`}>
                          <b>{event.min}</b>
                          <span>{EVENT_LABEL[event.type]}</span>
                          <strong>{event.players.join(', ') || event.text}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyDetail>
                      {status === 'upcoming'
                        ? 'Match events will appear here from kickoff.'
                        : 'A detailed event timeline is not available for this match.'}
                    </EmptyDetail>
                  )}
                  <dl class="fmd-facts">
                    <div><dt>Kickoff</dt><dd>{formatKickoff(match.utc)}</dd></div>
                    <div><dt>Venue</dt><dd>{detail?.info.venue || match.venue || 'To be confirmed'}</dd></div>
                    {detail?.info.referee && <div><dt>Referee</dt><dd>{detail.info.referee}</dd></div>}
                    {detail?.info.attendance && <div><dt>Attendance</dt><dd>{detail.info.attendance.toLocaleString()}</dd></div>}
                  </dl>
                </div>
              )}

              {tab === 'lineup' && (
                <div class="fmd-pane">
                  {detail?.lineups ? (
                    <>
                      <div class="fmd-lineup-heading">
                        <span>{match.home.name} <b>{detail.lineups.home.formation || ''}</b></span>
                        <strong>{status === 'upcoming' ? 'Expected lineups' : 'Starting lineups'}</strong>
                        <span><b>{detail.lineups.away.formation || ''}</b> {match.away.name}</span>
                      </div>
                      <Pitch home={detail.lineups.home} away={detail.lineups.away} />
                      <div class="fmd-subs-grid">
                        <Substitutes team={match.home.name} lineup={detail.lineups.home} />
                        <Substitutes team={match.away.name} lineup={detail.lineups.away} />
                      </div>
                    </>
                  ) : (
                    <EmptyDetail>
                      {status === 'upcoming'
                        ? 'Predicted lineups are not published yet. Provider-confirmed expected XIs will appear here when available.'
                        : 'Lineup data is not available for this match.'}
                    </EmptyDetail>
                  )}
                </div>
              )}

              {tab === 'table' && (
                <div class="fmd-pane">
                  {relevantTable ? (
                    <>
                      <h3 class="fmd-section-title">{relevantTable.name}</h3>
                      <div class="fmd-table-wrap">
                        <table class="fmd-table">
                          <thead>
                            <tr><th>#</th><th>Team</th><th>P</th><th>GD</th><th>Pts</th></tr>
                          </thead>
                          <tbody>
                            {relevantTable.rows.map((row) => (
                              <tr class={row.team.id === match.home.id || row.team.id === match.away.id ? 'is-match-team' : ''}>
                                <td>{row.rank}</td>
                                <td><TeamBadge logo={row.team.logo} name={row.team.name} /><span>{row.team.name}</span></td>
                                <td>{row.played}</td>
                                <td>{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                                <td><strong>{row.points}</strong></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <EmptyDetail>No competition table is available for these teams.</EmptyDetail>
                  )}
                </div>
              )}

              {tab === 'stats' && (
                <div class="fmd-pane">
                  {detail?.stats?.length ? (
                    <div class="fmd-stats">
                      {detail.stats.map((stat) => {
                        const total = stat.home + stat.away || 1;
                        const homeWidth = Math.round((stat.home / total) * 100);
                        return (
                          <div class="fmd-stat" key={stat.key}>
                            <div><strong>{stat.home}{stat.pct ? '%' : ''}</strong><span>{stat.label}</span><strong>{stat.away}{stat.pct ? '%' : ''}</strong></div>
                            <span class="fmd-stat-bar"><i style={`width:${homeWidth}%`} /><b style={`width:${100 - homeWidth}%`} /></span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyDetail>
                      {status === 'upcoming'
                        ? 'Team statistics will populate once the match starts.'
                        : 'Match statistics are not available from the provider.'}
                    </EmptyDetail>
                  )}
                </div>
              )}

              {tab === 'h2h' && (
                <div class="fmd-pane">
                  {detail?.form && (detail.form.home.length || detail.form.away.length) ? (
                    <div class="fmd-form-grid">
                      <FormList title={`${match.home.name} recent form`} games={detail.form.home} />
                      <FormList title={`${match.away.name} recent form`} games={detail.form.away} />
                    </div>
                  ) : null}
                  {detail?.h2h?.length ? (
                    <FormList title={`${match.home.name} vs ${match.away.name}`} games={detail.h2h} />
                  ) : (
                    <EmptyDetail>No recent head-to-head meetings are available.</EmptyDetail>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <footer class="fmd-source">Match data from ESPN. Availability varies by competition and kickoff proximity.</footer>
      </div>
    </div>
  );
}
