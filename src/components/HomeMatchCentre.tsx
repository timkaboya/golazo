import { useEffect, useRef, useState } from 'preact/hooks';
import type { FootballMatch, LeagueTable } from '../lib/football-types';
import { mergeFootballMatches, selectLandingMatches } from '../lib/football-stats';
import FootballMatchDrawer, { type FootballMatchContext } from './FootballMatchDrawer';
import { useFootballScores, type LiveScoreState } from './useFootballScores';

interface DisplayMatch extends FootballMatch {
  competition: string;
  competitionSlug: string;
}

interface MatchGroups {
  liveToday: DisplayMatch[];
  recent: DisplayMatch[];
  upcoming: DisplayMatch[];
}

interface CompetitionContext extends FootballMatchContext {
  slug: string;
}

type TabId = 'today' | 'recent' | 'upcoming';

const TABS: { id: TabId; label: string; title: string; empty: string }[] = [
  { id: 'today', label: 'Live & today', title: 'Playing now or today', empty: 'No games are scheduled today.' },
  { id: 'recent', label: 'Recent', title: '10 most recent results', empty: 'No recent results are available.' },
  { id: 'upcoming', label: 'Up next', title: 'Next 10 games', empty: 'No upcoming fixtures are available.' },
];

function matchesFor(groups: MatchGroups, tab: TabId) {
  if (tab === 'today') return groups.liveToday;
  return groups[tab];
}

function compactTime(utc: string, local: boolean) {
  if (!local) return new Date(utc).toUTCString();
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(utc));
}

function refreshLabel(state: LiveScoreState) {
  if (state === 'current') return 'Live scores updated · refreshes every minute';
  if (state === 'stale') return 'Using saved scores · live refresh will retry';
  return 'Checking for live scores…';
}

export default function HomeMatchCentre({
  groups,
  contexts,
}: {
  groups: MatchGroups;
  contexts: CompetitionContext[];
}) {
  const defaultTab: TabId = groups.liveToday.length ? 'today' : 'upcoming';
  const [tab, setTab] = useState<TabId>(defaultTab);
  const [selected, setSelected] = useState<DisplayMatch | null>(null);
  const [local, setLocal] = useState(false);
  const [allMatches, setAllMatches] = useState<DisplayMatch[]>(() =>
    mergeFootballMatches([], [
      ...groups.liveToday,
      ...groups.recent,
      ...groups.upcoming,
    ])
  );
  const hadLive = useRef(groups.liveToday.some((match) => match.status === 'live'));
  const userSelectedTab = useRef(false);
  const { snapshot, state } = useFootballScores();
  const currentGroups = selectLandingMatches(allMatches, new Date(), 10) as MatchGroups;
  const contextBySlug = new Map(contexts.map((context) => [context.slug, context]));
  const matches = matchesFor(currentGroups, tab);
  const tabInfo = TABS.find((item) => item.id === tab)!;
  const liveCount = currentGroups.liveToday.filter((match) => match.status === 'live').length;
  const selectedMatch = selected
    ? allMatches.find(
        (match) =>
          match.id === selected.id && match.competitionSlug === selected.competitionSlug
      ) ?? selected
    : null;

  useEffect(() => setLocal(true), []);
  useEffect(() => {
    if (!snapshot) return;
    const refreshed = snapshot.competitions.flatMap((competition) =>
      competition.matches.map((match) => ({
        ...match,
        competition: competition.name,
        competitionSlug: competition.slug,
      }))
    );
    setAllMatches((saved) => mergeFootballMatches(saved, refreshed));
  }, [snapshot]);
  useEffect(() => {
    if (liveCount > 0 && !hadLive.current && !userSelectedTab.current) {
      setTab('today');
      hadLive.current = true;
    }
  }, [liveCount]);

  return (
    <>
      <div class="home-panel-heading">
        <div><span class="eyebrow">Across all competitions</span><h2>Match centre</h2></div>
        <div class={`home-live-status${liveCount ? ' active' : ''}`}>
          <span />{liveCount ? `${liveCount} live now` : "Today's football"}
        </div>
      </div>
      <p class="home-score-refresh" aria-live="polite">{refreshLabel(state)}</p>
      <div class="home-match-tabs" role="tablist" aria-label="Match centre views">
        {TABS.map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => {
              userSelectedTab.current = true;
              setTab(item.id);
            }}
            key={item.id}
          >
            {item.label} <span>{matchesFor(currentGroups, item.id).length}</span>
          </button>
        ))}
      </div>
      <div class="home-match-panels">
        <section class="home-match-group">
          <h3>{tabInfo.title}</h3>
          {matches.length ? (
            <div class="home-match-list">
              {matches.map((match) => (
                <button
                  type="button"
                  class="home-match-card"
                  data-match-id={match.id}
                  onClick={() => setSelected(match)}
                  aria-label={`${match.home.name} versus ${match.away.name}, open match centre`}
                  key={`${match.competitionSlug}-${match.id}`}
                >
                  <div class="home-match-meta">
                    <span>{match.competition}</span>
                    {match.status === 'upcoming'
                      ? <time dateTime={match.utc}>{compactTime(match.utc, local)}</time>
                      : <strong class={match.status === 'live' ? 'is-live' : ''}>{match.note || (match.status === 'live' ? 'Live' : 'FT')}</strong>}
                  </div>
                  <div class="home-match-team">
                    {match.home.logo ? <img src={match.home.logo} alt="" /> : <span />}
                    <strong>{match.home.name}</strong>
                    <b>{match.score?.home ?? ''}</b>
                  </div>
                  <div class="home-match-team">
                    {match.away.logo ? <img src={match.away.logo} alt="" /> : <span />}
                    <strong>{match.away.name}</strong>
                    <b>{match.score?.away ?? ''}</b>
                  </div>
                </button>
              ))}
            </div>
          ) : <p class="home-match-empty">{tabInfo.empty}</p>}
        </section>
      </div>
      {selectedMatch && (
        <FootballMatchDrawer
          match={selectedMatch}
          context={contextBySlug.get(selectedMatch.competitionSlug) ?? {
            name: selectedMatch.competition,
            espn: 'fifa.world',
            tables: [] as LeagueTable[],
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
