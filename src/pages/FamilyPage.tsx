import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useFamily } from '../context/FamilyContext.js';
import {
  Users,
  Shield,
  UserPlus,
  Key,
  Copy,
  Check,
  Edit2,
  Trash2,
  Crown,
  LogOut,
  X,
  AlertCircle
} from 'lucide-react';
import { CircleCareAPI } from '../lib/api.js';
import { FamilyRole } from '../types/index.js';

export const FamilyPage: React.FC = () => {
  const { user, family, role } = useAuth();
  const { members, refreshData } = useFamily();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState<string | null>(null);

  // Invite state
  const [inviteCode, setInviteCode] = useState('');
  const [inviteExpires, setInviteExpires] = useState('');
  const [inviteRole, setInviteRole] = useState<FamilyRole>('member');
  const [copied, setCopied] = useState(false);

  // Redeem state
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // Transfer state
  const [transferTargetUid, setTransferTargetUid] = useState('');

  // Edit Family Name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [familyNameInput, setFamilyNameInput] = useState(family?.name || '');

  const isOwner = role === 'owner';
  const isAdmin = role === 'admin';
  const canManageMembers = isOwner || isAdmin;

  const handleGenerateInvite = async () => {
    try {
      const invite = await CircleCareAPI.createInvitation(inviteRole);
      setInviteCode(invite.code);
      setInviteExpires(new Date(invite.expiresAt).toLocaleDateString());
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRedeemInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeemError(null);
    try {
      await CircleCareAPI.redeemInvitation(redeemCode.trim());
      setShowRedeemModal(false);
      setRedeemCode('');
      await refreshData();
      alert('Successfully joined the new family!');
    } catch (err: any) {
      setRedeemError(err.message);
    }
  };

  const handleSaveFamilyName = async () => {
    if (!familyNameInput.trim()) return;
    try {
      await CircleCareAPI.renameFamily(familyNameInput.trim());
      setIsEditingName(false);
      await refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleChangeRole = async (targetUid: string, newRole: FamilyRole) => {
    try {
      await CircleCareAPI.updateMemberRole(targetUid, newRole);
      setShowRoleModal(null);
      await refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveMember = async (targetUid: string) => {
    if (confirm('Are you sure you want to remove this member?')) {
      try {
        await CircleCareAPI.removeMember(targetUid);
        await refreshData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferTargetUid) return;
    if (confirm('Are you sure you want to transfer ownership of this family? You will become an Admin.')) {
      try {
        await CircleCareAPI.transferOwnership(transferTargetUid);
        setShowTransferModal(false);
        await refreshData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Family Hub & Access Control
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage memberships, role-based authorization matrices, and invite codes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageMembers && (
            <button
              onClick={() => {
                handleGenerateInvite();
                setShowInviteModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Member</span>
            </button>
          )}

          <button
            onClick={() => setShowRedeemModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Key className="w-4 h-4 text-slate-500" />
            <span>Join with Code</span>
          </button>
        </div>
      </div>

      {/* Family Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Family Workspace
            </span>
            {isEditingName ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={familyNameInput}
                  onChange={(e) => setFamilyNameInput(e.target.value)}
                  className="px-3 py-1 text-lg font-bold border border-slate-300 rounded-lg text-slate-900"
                />
                <button
                  onClick={handleSaveFamilyName}
                  className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="px-2 py-1 text-slate-500 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <h2 className="text-xl font-extrabold text-slate-900">
                  {family?.name}
                </h2>
                {canManageMembers && (
                  <button
                    onClick={() => {
                      setFamilyNameInput(family?.name || '');
                      setIsEditingName(true);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600"
                    title="Rename family"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Family ID: <code className="text-slate-700 font-mono">{family?.familyId}</code> • Formed on {family?.createdAt ? new Date(family.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                onClick={() => {
                  setTransferTargetUid('');
                  setShowTransferModal(true);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span>Transfer Ownership</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Members Directory & Role Matrix (FR-FAM-004) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Members Directory & Access Roles
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict isolation: Family data cannot be viewed or modified by users outside this circle (FR-FAM-007).
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {members.length} Active Member{members.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {members.map(member => {
            const isMe = member.uid === user?.uid;
            return (
              <div
                key={member.uid}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm">
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {member.displayName}
                      </span>
                      {isMe && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                          You
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        member.role === 'owner' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        member.role === 'admin' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        member.role === 'member' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {member.role}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      {member.email} • Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Role Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {isOwner && !isMe && (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={member.role}
                        onChange={(e) => handleChangeRole(member.uid, e.target.value as FamilyRole)}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs bg-white font-medium focus:ring-indigo-500"
                        title="Change role (Owner only)"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer (Child/Read-only)</option>
                      </select>

                      <button
                        onClick={() => handleRemoveMember(member.uid)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Remove member from family"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {!isOwner && canManageMembers && member.role !== 'owner' && !isMe && (
                    <button
                      onClick={() => handleRemoveMember(member.uid)}
                      className="px-2.5 py-1 text-xs rounded border border-rose-200 text-rose-600 hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invite Modal (FR-FAM-002) */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                Invite Family Member
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <p className="text-slate-600">
                Share this secure invitation code with your family member. It expires in 7 days and can only be redeemed once.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Invite as Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => {
                    setInviteRole(e.target.value as FamilyRole);
                    handleGenerateInvite();
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="member">Regular Member (Create & complete tasks)</option>
                  <option value="admin">Admin (Manage tasks, calendar, members)</option>
                  <option value="viewer">Viewer (Read-only child or relative)</option>
                </select>
              </div>

              {inviteCode && (
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80 text-center">
                  <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block mb-1">
                    Single-Use Invitation Code
                  </span>
                  <div className="text-xl font-mono font-extrabold text-indigo-900 tracking-wider">
                    {inviteCode}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Expires on {inviteExpires}
                  </span>

                  <button
                    onClick={handleCopyCode}
                    className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold inline-flex items-center gap-1.5 shadow-xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied to Clipboard' : 'Copy Invitation Code'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 mt-4">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redeem Modal (FR-FAM-003) */}
      {showRedeemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600" />
                Join a Family with Invite Code
              </h3>
              <button
                onClick={() => setShowRedeemModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRedeemInvite} className="mt-4 space-y-4 text-xs">
              {redeemError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                  {redeemError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Invitation Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MILLER2026 or FAM-XYZ"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-sm tracking-wide uppercase"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRedeemModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                >
                  Join Family
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal (FR-FAM-006) */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                Transfer Family Ownership
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                Transferring ownership gives another adult full rights over this family, including the power to delete it or modify roles. You will remain an Admin.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select New Owner
                </label>
                <select
                  value={transferTargetUid}
                  onChange={(e) => setTransferTargetUid(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">Choose a member...</option>
                  {members.filter(m => m.uid !== user?.uid && (m.role === 'admin' || m.role === 'member')).map(m => (
                    <option key={m.uid} value={m.uid}>
                      {m.displayName} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTransferOwnership}
                  disabled={!transferTargetUid}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold shadow-xs"
                >
                  Confirm Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
