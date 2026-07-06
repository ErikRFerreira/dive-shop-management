import { Card, CardContent } from '@/components/ui/card';

interface ComingSoonProps {
  /**
   * Optional title for the coming soon message.
   * Defaults to "Coming Soon"
   */
  title?: string;
  /**
   * Optional description text.
   */
  description?: string;
}

/**
 * Simple, calm coming soon component for features under development.
 * Displays a centered message in a card layout.
 */
export function ComingSoon({
  title = 'Coming Soon',
  description,
}: ComingSoonProps) {
  return (
    <div className="flex items-center justify-center min-h-100">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="mb-2">
            <h2 className="text-2xl font-semibold text-muted-foreground">
              {title}
            </h2>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
