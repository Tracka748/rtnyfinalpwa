ALTER TABLE crews
ADD COLUMN crew_status TEXT CHECK (
  crew_status IN (
    'family', 'couples', 'friends', 'coworkers',
    'college_friends', 'sports_team', 'gaming_group',
    'birthday_group', 'community_volunteer', 'club_organization'
  )
);
