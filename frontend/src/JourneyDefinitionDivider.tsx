export function JourneyDefinitionDivider({ label, as: Heading = 'h4' }: { label: string; as?: 'h4' | 'h6' }) {
  return <Heading className="journey-definition-label">
    <span className="journey-definition-caption">
      <span className="global-sparks" aria-hidden="true" />
      <span>{label}</span>
    </span>
  </Heading>;
}
