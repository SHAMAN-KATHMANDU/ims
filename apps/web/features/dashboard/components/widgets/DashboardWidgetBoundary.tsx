"use client";

/**
 * Error boundary for dashboard widgets so one failing widget does not break the whole dashboard.
 */

import { Component, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface Props {
  widgetId: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class DashboardWidgetBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error(`Dashboard widget "${this.props.widgetId}" error:`, error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="shadow-sm border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle
                className="h-4 w-4 text-destructive"
                aria-hidden="true"
              />
              Widget unavailable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This widget could not be loaded. Refresh the page or try again
              later.
            </p>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
