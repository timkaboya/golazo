import { useEffect, useState } from 'preact/hooks';
import type { FootballMatch, LeagueTable } from '../lib/football-types';
import FootballMatchDrawer, { type FootballMatchContext } from './FootballMatchDrawer';

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
  const contextBySlug = new Map(contexts.map((context) => [context.slug, context]));
  const matches = matchesFor(groups, tab);
  const tabInfo = TABS.find((item) => item.id === tab)!;
  const liveCount = groups.liveToday.filter((match) => match.status === 'live').length;

  useEffect(() => setLocal(true), []);

  return (
    <>
      <div class="home-panel-heading">
        <div><span class="eyebrow">Across all competitions</span><h2>Match centre</h2></div>
        <div class={`home-live-status${liveCount ? ' active' : ''}`}>
          <span />{liveCount ? `${liveCount} live now` : "Today's football"}
        </div>
      </div>
      <div class="home-match-tabs" role="tablist" aria-label="Match centre views">
        {TABS.map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            key={item.id}
          >
            {item.label} <span>{matchesFor(groups, item.id).length}</span>
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
                  onClick={() => setSelected(match)}
                  aria-label={`${match.home.name} versus ${match.away.name}, open match centre`}
                  key={`${match.competitionSlug}-${match.id}`}
                >
                  <div class="home-match-meta">
                    <span>{match.competition}</span>
                    <time dateTime={match.utc}>{compactTime(match.utc, local)}</time>
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
      {selected && (
        <FootballMatchDrawer
          match={selected}
          context={contextBySlug.get(selected.competitionSlug) ?? {
            name: selected.competition,
            espn: 'fifa.world',
            tables: [] as LeagueTable[],
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
