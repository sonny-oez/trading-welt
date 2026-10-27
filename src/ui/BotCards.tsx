import { useDesk } from '../data/store';
import { STATIONS } from '../scene/layout';

export function BotCards() {
  const desk = useDesk();
  const colors = new Map(STATIONS.map((station) => [station.station, station.color]));
  return (
    <div className="team">
      <p className="pane-kicker">{desk.headline}</p>
      <ul>
        {desk.bots.map((bot) => (
          <li key={bot.station}>
            <span className="avatar" style={{ background: colors.get(bot.station) ?? '#7ae7ff' }} />
            <div>
              <div className="bot-line">
                <strong>{bot.role}</strong>
                <em>{bot.status}</em>
              </div>
              <p>{bot.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
