import { useEffect, useState } from 'react';
import { testSupabaseConnection } from '@/lib/supabaseClient';

export const SupabaseTest = () => {
  const [testResult, setTestResult] = useState<{
    success: boolean;
    data?: any;
    error?: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const runTest = async () => {
      const result = await testSupabaseConnection();
      setTestResult(result);
      setIsLoading(false);
    };

    runTest();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 bg-yellow-100 text-yellow-800 rounded-md">
        Testing Supabase connection...
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-md ${
      testResult?.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      <h3 className="font-bold mb-2">
        {testResult?.success ? '✅ Supabase Connection Successful!' : '❌ Supabase Connection Failed'}
      </h3>
      
      <div className="mt-2 p-2 bg-white/50 rounded text-sm overflow-x-auto">
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(testResult, null, 2)}
        </pre>
      </div>
      
      {!testResult?.success && (
        <div className="mt-4 p-3 bg-white/50 rounded text-sm">
          <p className="font-semibold">Troubleshooting steps:</p>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Check if your Supabase project is running</li>
            <li>Verify the URL and anon key in your .env file</li>
            <li>Ensure CORS is properly configured in your Supabase dashboard</li>
            <li>Check the browser's console for detailed error messages</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default SupabaseTest;
