-- ZenTrackr Database Setup SQL
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security (RLS) for all tables
-- This ensures users can only access their own data

-- 1. Daily Entries Table
CREATE TABLE daily_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    weight DECIMAL(5,2),
    calories INTEGER,
    protein DECIMAL(6,2),
    carbs DECIMAL(6,2),
    fat DECIMAL(6,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, entry_date)
);

-- 2. Weekly Targets Table
CREATE TABLE weekly_targets (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    goal_type VARCHAR(20) DEFAULT 'bulking' CHECK (goal_type IN ('bulking', 'weight_loss')),
    target_weight DECIMAL(5,2),
    target_calories_min INTEGER,
    target_calories_max INTEGER,
    target_protein_min DECIMAL(6,2),
    target_protein_max DECIMAL(6,2),
    target_carbs_min DECIMAL(6,2),
    target_carbs_max DECIMAL(6,2),
    target_fat_min DECIMAL(6,2),
    target_fat_max DECIMAL(6,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_number)
);

-- 3. Reminders Table
CREATE TABLE reminders (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    day INTEGER, -- Legacy field for single day
    days TEXT, -- New field for multiple days (comma-separated)
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Progress Photos Table
CREATE TABLE progress_photos (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    photo_date DATE NOT NULL,
    front_relaxed TEXT, -- Storage path
    side_relaxed TEXT,
    back_relaxed TEXT,
    front_flexed TEXT,
    biceps TEXT,
    shoulders TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, photo_date)
);

-- 5. Body Measurements Table
CREATE TABLE body_measurements (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    measurement_date DATE NOT NULL,
    chest DECIMAL(5,2),
    waist DECIMAL(5,2),
    arms DECIMAL(5,2),
    shoulders DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, measurement_date)
);

-- 6. Quotes Table (Global - no user_id needed)
CREATE TABLE quotes (
    id BIGSERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
-- Quotes table doesn't need RLS as it's global

-- Create RLS Policies
-- Daily Entries Policies
CREATE POLICY "Users can view own daily entries" ON daily_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily entries" ON daily_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily entries" ON daily_entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily entries" ON daily_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Weekly Targets Policies
CREATE POLICY "Users can view own weekly targets" ON weekly_targets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly targets" ON weekly_targets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly targets" ON weekly_targets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly targets" ON weekly_targets
    FOR DELETE USING (auth.uid() = user_id);

-- Reminders Policies
CREATE POLICY "Users can view own reminders" ON reminders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders" ON reminders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders" ON reminders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders" ON reminders
    FOR DELETE USING (auth.uid() = user_id);

-- Progress Photos Policies
CREATE POLICY "Users can view own progress photos" ON progress_photos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress photos" ON progress_photos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress photos" ON progress_photos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress photos" ON progress_photos
    FOR DELETE USING (auth.uid() = user_id);

-- Body Measurements Policies
CREATE POLICY "Users can view own body measurements" ON body_measurements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own body measurements" ON body_measurements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own body measurements" ON body_measurements
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own body measurements" ON body_measurements
    FOR DELETE USING (auth.uid() = user_id);

-- Quotes Policies (Everyone can read)
CREATE POLICY "Anyone can view quotes" ON quotes
    FOR SELECT USING (true);

-- Insert sample motivational quotes
INSERT INTO quotes (text) VALUES
('The only bad workout is the one that didn''t happen.'),
('Your body can do it. It''s your mind you have to convince.'),
('Success is the sum of small efforts repeated day in and day out.'),
('Don''t wish for it, work for it.'),
('The pain you feel today will be the strength you feel tomorrow.'),
('Champions train, losers complain.'),
('Sweat is fat crying.'),
('You don''t have to be extreme, just consistent.'),
('The groundwork for all happiness is good health.'),
('Take care of your body. It''s the only place you have to live.'),
('Health is not about the weight you lose, but about the life you gain.'),
('Every workout is progress.'),
('Strong is the new skinny.'),
('Fitness is not about being better than someone else. It''s about being better than you used to be.'),
('The only way to finish is to start.'),
('Your limitation—it''s only your imagination.'),
('Push yourself because no one else is going to do it for you.'),
('Great things never come from comfort zones.'),
('Dream it. Wish it. Do it.'),
('Success doesn''t just find you. You have to go out and get it.'),
('The harder you work for something, the greater you''ll feel when you achieve it.'),
('Dream bigger. Do bigger.'),
('Don''t stop when you''re tired. Stop when you''re done.'),
('Wake up with determination. Go to bed with satisfaction.'),
('Do something today that your future self will thank you for.'),
('Little progress is still progress.'),
('Great things never come from comfort zones.'),
('Don''t wish for it, work for it.'),
('Success starts with self-discipline.'),
('Be stronger than your strongest excuse.'),
('The only impossible journey is the one you never begin.'),
('What seems impossible today will one day become your warm-up.'),
('Don''t wait for opportunity. Create it.'),
('Champions keep playing until they get it right.'),
('The difference between ordinary and extraordinary is that little extra.'),
('You are your only limit.'),
('Make yourself proud.'),
('Progress, not perfection.'),
('Believe you can and you''re halfway there.'),
('The best time to plant a tree was 20 years ago. The second best time is now.'),
('You don''t have to see the whole staircase, just take the first step.'),
('The journey of a thousand miles begins with one step.'),
('Fall seven times, stand up eight.'),
('It''s not about perfect. It''s about effort.'),
('Strive for progress, not perfection.'),
('Every master was once a disaster.'),
('You are capable of amazing things.'),
('The comeback is always stronger than the setback.'),
('Difficult roads often lead to beautiful destinations.'),
('Your potential is endless.'),
('Be patient with yourself. Nothing in nature blooms all year.'),
('Small steps every day lead to big changes over time.'),
('You didn''t come this far to only come this far.'),
('The best investment you can make is in yourself.'),
('Your health is an investment, not an expense.'),
('Take it one day at a time.'),
('You are stronger than you think.'),
('Every day is a new beginning.'),
('Focus on being healthy, not skinny.'),
('Your body is your temple. Keep it pure and clean for the soul to reside in.'),
('Health is the greatest gift, contentment the greatest wealth.'),
('To keep the body in good health is a duty... otherwise we shall not be able to keep our mind strong and clear.'),
('The first wealth is health.'),
('A healthy outside starts from the inside.'),
('Your diet is a bank account. Good food choices are good investments.'),
('Eat well, move daily, hydrate often, sleep lots, love your body, repeat for life.'),
('You can''t out-exercise a bad diet.'),
('Let food be thy medicine and medicine be thy food.'),
('The food you eat can be either the safest and most powerful form of medicine or the slowest form of poison.'),
('Take care of your body. It''s the only place you have to live.'),
('Health is not valued until sickness comes.'),
('An apple a day keeps the doctor away.'),
('Early to bed and early to rise makes a man healthy, wealthy, and wise.'),
('The best doctor gives the least medicines.'),
('Prevention is better than cure.'),
('A fit body, a calm mind, a house full of love. These things cannot be bought – they must be earned.'),
('Physical fitness is not only one of the most important keys to a healthy body, it is the basis of dynamic and creative intellectual activity.'),
('The reason I exercise is for the quality of life I enjoy.'),
('Exercise is king. Nutrition is queen. Put them together and you''ve got a kingdom.'),
('A one hour workout is 4% of your day. No excuses.'),
('The only bad workout is the one that didn''t happen.'),
('Fitness is like a relationship. You can''t cheat and expect it to work.'),
('You''re only one workout away from a good mood.'),
('Exercise should be regarded as tribute to the heart.'),
('Those who think they have not time for bodily exercise will sooner or later have to find time for illness.'),
('Movement is a medicine for creating change in a person''s physical, emotional, and mental states.'),
('If you don''t make time for exercise, you''ll probably have to make time for illness.'),
('The groundwork for all happiness is good health.'),
('To enjoy the glow of good health, you must exercise.'),
('Exercise is the key not only to physical health but to peace of mind.'),
('A strong body makes the mind strong.'),
('Physical fitness is the first requisite of happiness.'),
('The human body is the best picture of the human soul.'),
('Your body is precious. It is our vehicle for awakening. Treat it with care.'),
('Listen to your body. It''s smarter than you think.'),
('Respect your body. It''s the only one you get.'),
('Your body is your home. Make it a beautiful place to live.'),
('Love yourself enough to live a healthy lifestyle.'),
('Health is not about the weight you lose, but about the life you gain.'),
('Being healthy and fit isn''t a fad or a trend, it''s a lifestyle.'),
('A healthy lifestyle not only changes your body, it changes your mind, your attitude, and your mood.'),
('Healthy habits are learned in the same way as unhealthy ones – through practice.'),
('The secret of health for both mind and body is not to mourn for the past, nor to worry about the future, but to live the present moment wisely and earnestly.'),
('Health is a state of complete harmony of the body, mind and spirit.'),
('The greatest revolution of our generation is the discovery that human beings, by changing the inner attitudes of their minds, can change the outer aspects of their lives.'),
('What we think, we become.'),
('The mind is everything. What you think you become.'),
('You have power over your mind – not outside events. Realize this, and you will find strength.'),
('A calm mind brings inner strength and self-confidence, so that''s very important for good health.'),
('Peace comes from within. Do not seek it without.'),
('The present moment is the only time over which we have dominion.'),
('Yesterday is history, tomorrow is a mystery, today is a gift of God, which is why we call it the present.'),
('Life is what happens to you while you''re busy making other plans.'),
('The purpose of our lives is to be happy.'),
('Life is 10% what happens to you and 90% how you react to it.'),
('In the end, we will remember not the words of our enemies, but the silence of our friends.'),
('The only way to do great work is to love what you do.'),
('Innovation distinguishes between a leader and a follower.'),
('Stay hungry, stay foolish.'),
('The future belongs to those who believe in the beauty of their dreams.'),
('It is during our darkest moments that we must focus to see the light.'),
('The way to get started is to quit talking and begin doing.'),
('Don''t let yesterday take up too much of today.'),
('You learn more from failure than from success. Don''t let it stop you. Failure builds character.'),
('If you are working on something that you really care about, you don''t have to be pushed. The vision pulls you.'),
('Experience is a hard teacher because she gives the test first, the lesson afterwards.'),
('I have learned throughout my life as a composer chiefly through my mistakes and pursuits of false assumptions, not by my exposure to founts of wisdom and knowledge.'),
('Success is walking from failure to failure with no loss of enthusiasm.'),
('It is better to fail in originality than to succeed in imitation.');

-- Create Storage Bucket for Progress Photos (Run this in Supabase Dashboard > Storage)
-- You'll need to create this manually in the Supabase dashboard:
-- 1. Go to Storage in your Supabase dashboard
-- 2. Create a new bucket called 'progress-photos'
-- 3. Make it public if you want direct access to images
-- 4. Set up appropriate policies for user access

-- Create indexes for better performance
CREATE INDEX idx_daily_entries_user_date ON daily_entries(user_id, entry_date);
CREATE INDEX idx_weekly_targets_user_week ON weekly_targets(user_id, week_number);
CREATE INDEX idx_reminders_user_active ON reminders(user_id, is_active);
CREATE INDEX idx_progress_photos_user_date ON progress_photos(user_id, photo_date);
CREATE INDEX idx_body_measurements_user_date ON body_measurements(user_id, measurement_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_daily_entries_updated_at BEFORE UPDATE ON daily_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_weekly_targets_updated_at BEFORE UPDATE ON weekly_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_progress_photos_updated_at BEFORE UPDATE ON progress_photos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_body_measurements_updated_at BEFORE UPDATE ON body_measurements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();