'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from 'react';

export default function EmbedPage() {
  const [args, setArgs] = useState('Loading...');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const params = Array.from(urlParams.entries()).map(([key, value]) => `${key}: ${value}`).join(', ');
    setArgs(params || 'None');
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-transparent">
      <Card className="w-80">
        <CardHeader>
          <CardTitle>Embedded Widget</CardTitle>
          <CardDescription>This is a simple card rendered in an iframe.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Arguments: {args}</p>
        </CardContent>
      </Card>
    </div>
  );
}