import React, { useState, useEffect } from 'react';
import { Users, Mail, UserPlus, Shield, Trash2, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

interface TeamMember extends UserProfile {
  status: 'active' | 'pending';
}

interface TeamManagementProps {
  userProfile: UserProfile;
}

export default function TeamManagement({ userProfile }: TeamManagementProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchTeam = async () => {
    if (!userProfile.company_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('company_id', userProfile.company_id);

      if (error) throw error;
      
      // For demo purposes, we'll just use the profiles we found
      // In a real app, we'd also fetch pending invites from an 'invites' table
      setMembers((data || []).map(m => ({ ...m, status: 'active' })));
    } catch (err) {
      console.error('Error fetching team:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [userProfile.company_id]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    if (members.length >= 20) {
      setError('Team limit reached (20 members max).');
      return;
    }

    setInviting(true);
    setError(null);
    setSuccess(null);

    try {
      // In a real app, this would send an email and create a record in an 'invites' table
      // For this demo, we'll simulate a successful invite
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      
      // Add a mock pending member
      const mockPending: TeamMember = {
        id: Math.random().toString(),
        full_name: 'Pending Invite',
        email: inviteEmail,
        plan: 'company',
        role: 'broker',
        company_id: userProfile.company_id,
        daily_message_count: 0,
        weekly_message_count: 0,
        last_message_date: null,
        status: 'pending'
      };
      
      setMembers(prev => [...prev, mockPending]);
    } catch (err) {
      setError('Failed to send invitation. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    
    try {
      // In a real app, this would update the user_profile to remove company_id
      setMembers(prev => prev.filter(m => m.id !== memberId));
      setSuccess('Member removed successfully.');
    } catch (err) {
      setError('Failed to remove member.');
    }
  };

  return (
    <div className="p-10 max-w-6xl mx-auto space-y-12">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-5xl font-serif font-bold text-archo-ink">Team Management</h2>
          <p className="text-archo-brass text-[10px] font-bold uppercase tracking-[0.3em] mt-3">Company Plan Dashboard</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-serif font-bold text-archo-ink">{members.length} / 20</p>
          <p className="text-archo-muted text-[10px] font-bold uppercase tracking-widest mt-1">Active Seats</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Invite Section */}
        <div className="lg:col-span-1 space-y-8">
          <section className="bg-archo-paper p-8 rounded-[32px] border border-archo-brass/10 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-archo-brass/10 flex items-center justify-center text-archo-brass">
                <UserPlus size={20} />
              </div>
              <h3 className="text-lg font-serif font-bold text-archo-ink">Invite Member</h3>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-archo-brass uppercase tracking-widest mb-2 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-archo-muted" size={18} />
                  <input 
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="broker@company.com"
                    className="w-full pl-12 pr-4 py-4 bg-archo-cream border border-archo-brass/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-archo-brass/20 transition-all text-sm"
                    required
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={inviting}
                className="w-full py-4 bg-archo-ink text-archo-cream rounded-2xl font-serif font-bold hover:bg-archo-ink/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {inviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </form>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 p-4 bg-emerald-50 text-emerald-600 rounded-xl text-xs flex items-center gap-2"
                >
                  <CheckCircle2 size={14} />
                  {success}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="bg-archo-ink text-archo-cream p-8 rounded-[32px] border border-white/10 shadow-xl overflow-hidden relative">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-archo-brass/20 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h4 className="text-sm font-bold uppercase tracking-[0.2em] mb-4">Team Benefits</h4>
              <ul className="space-y-4">
                {[
                  'Shared Case Pipeline',
                  'Team Performance Analytics',
                  'Admin Control Dashboard',
                  'Centralized Company Billing'
                ].map((benefit, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs text-archo-cream/70">
                    <div className="w-1.5 h-1.5 rounded-full bg-archo-brass" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        {/* Members List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-serif font-bold text-archo-ink">Team Members</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-archo-muted" size={14} />
              <input 
                type="text"
                placeholder="Search members..."
                className="pl-9 pr-4 py-2 bg-archo-paper border border-archo-brass/10 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-archo-brass/30 w-48"
              />
            </div>
          </div>

          <div className="bg-archo-paper rounded-[32px] border border-archo-brass/10 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-archo-brass/10">
                    <th className="px-8 py-5 text-[10px] font-bold text-archo-brass uppercase tracking-widest">Member</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-archo-brass uppercase tracking-widest">Role</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-archo-brass uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-archo-brass uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-archo-brass/5">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-archo-muted italic">Loading team members...</td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-archo-muted italic">No team members found. Start by inviting your brokers.</td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr key={member.id} className="group hover:bg-archo-cream/50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-archo-brass/10 flex items-center justify-center text-archo-brass font-bold">
                              {member.full_name?.[0] || member.email?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-archo-ink">{member.full_name}</p>
                              <p className="text-xs text-archo-muted">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <Shield size={14} className={member.role === 'admin' ? 'text-archo-gold' : 'text-archo-muted'} />
                            <span className="text-xs font-medium capitalize text-archo-slate">{member.role}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                            member.status === 'active' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          {member.id !== userProfile.id && (
                            <button 
                              onClick={() => removeMember(member.id)}
                              className="p-2 text-archo-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              title="Remove Member"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
