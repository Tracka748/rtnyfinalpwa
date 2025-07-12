-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow user registration" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Memberships table policies
CREATE POLICY "Users can view their own memberships" ON memberships
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memberships" ON memberships
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memberships" ON memberships
    FOR UPDATE USING (auth.uid() = user_id);

-- Venues table policies (public read access)
CREATE POLICY "Anyone can view venues" ON venues
    FOR SELECT USING (true);

-- Events table policies (public read access for published events)
CREATE POLICY "Anyone can view published events" ON events
    FOR SELECT USING (status = 'published');

-- Tickets table policies
CREATE POLICY "Users can view their own tickets" ON tickets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can purchase tickets" ON tickets
    FOR UPDATE USING (
        auth.uid() = user_id AND 
        status = 'available' AND 
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = tickets.event_id 
            AND events.status = 'published'
            AND events.event_date > NOW()
        )
    );

-- Perks table policies (public read access)
CREATE POLICY "Anyone can view perks" ON perks
    FOR SELECT USING (is_active = true);

-- Membership perks policies
CREATE POLICY "Users can view their membership perks" ON membership_perks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM memberships 
            WHERE memberships.id = membership_perks.membership_id 
            AND memberships.user_id = auth.uid()
        )
    );

-- Sweepstakes entries policies
CREATE POLICY "Users can view their own sweepstakes entries" ON sweepstakes_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create sweepstakes entries" ON sweepstakes_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);
