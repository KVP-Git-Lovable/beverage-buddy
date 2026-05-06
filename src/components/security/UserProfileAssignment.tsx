import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Shield, User } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  user_id: string;
  profile_id: string;
  profiles?: {
    full_name: string | null;
    username: string | null;
  };
  security_profiles?: {
    name: string;
  };
}

export const UserProfileAssignment = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all users with their profiles
  const { data: userProfiles, isLoading } = useQuery({
    queryKey: ['user-profile-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          profile_id,
          security_profiles:profile_id (name)
        `);
      
      if (error) throw error;

      // Fetch profile data for each user
      const enrichedData = await Promise.all(
        (data || []).map(async (up: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', up.user_id)
            .single();
          
          return {
            ...up,
            profiles: profile
          };
        })
      );

      return enrichedData as UserProfile[];
    }
  });

  // Fetch all profiles for dropdown
  const { data: profiles } = useQuery({
    queryKey: ['security-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_profiles')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async ({ userId, profileId }: { userId: string; profileId: string }) => {
      const { error } = await supabase
        .from('user_profiles')
        .upsert(
          { user_id: userId, profile_id: profileId },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile-assignments'] });
      toast.success('User profile updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    }
  });

  const handleProfileChange = (userId: string, profileId: string) => {
    updateProfileMutation.mutate({ userId, profileId });
  };

  const filteredUsers = userProfiles?.filter(up => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = up.profiles?.full_name?.toLowerCase() || '';
    const username = up.profiles?.username?.toLowerCase() || '';
    const profileName = (up.security_profiles as any)?.name?.toLowerCase() || '';
    
    return fullName.includes(searchLower) || 
           username.includes(searchLower) || 
           profileName.includes(searchLower);
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile Assignment</CardTitle>
        <CardDescription>Assign security profiles to users</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, username, or profile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* User Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Current Profile</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers?.map((up) => (
              <TableRow key={up.user_id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{up.profiles?.full_name || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">@{up.profiles?.username || 'N/A'}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="flex items-center gap-1 w-fit">
                    <Shield className="h-3 w-3" />
                    {(up.security_profiles as any)?.name || 'No Profile'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Select
                    value={up.profile_id}
                    onValueChange={(value) => handleProfileChange(up.user_id, value)}
                  >
                    <SelectTrigger className="w-[200px] ml-auto">
                      <SelectValue placeholder="Select profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles?.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredUsers?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No users found
          </div>
        )}
      </CardContent>
    </Card>
  );
};
