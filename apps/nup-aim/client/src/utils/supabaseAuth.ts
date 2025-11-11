import { supabase } from '../lib/supabase';
import { User, Profile, Permission, SYSTEM_MODULES } from '../types/auth';
import { sendVerificationEmail } from './emailService';

export interface SupabaseUser {
  id: string;
  username: string;
  email: string;
  profile_id: string;
  is_active: boolean;
  is_email_verified: boolean;
  last_login: string | null;
  created_at: string;
}

export interface SupabaseProfile {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_default: boolean;
  created_at: string;
}

// Check if Supabase is properly configured
const isSupabaseConfigured = (): boolean => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  return !!(
    supabaseUrl && 
    supabaseKey && 
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseKey !== 'your-anon-key' &&
    supabase
  );
};

// Convert Supabase types to local types
const convertSupabaseUserToLocal = (supabaseUser: any, supabaseProfile: any): { user: User; profile: Profile } => {
  const user: User = {
    id: supabaseUser.id,
    username: supabaseUser.username,
    email: supabaseUser.email,
    password: '', // Don't store password in frontend
    profileId: supabaseUser.profile_id,
    isActive: supabaseUser.is_active,
    isEmailVerified: supabaseUser.is_email_verified,
    createdAt: supabaseUser.created_at,
    lastLogin: supabaseUser.last_login
  };

  // Ensure permissions is an array of strings
  const permissionStrings = Array.isArray(supabaseProfile.permissions) 
    ? supabaseProfile.permissions 
    : [];

  // Convert string permissions to Permission objects
  const permissions: Permission[] = permissionStrings.map((perm: string) => {
    const [module, action] = perm.split('_');
    return {
      id: perm,
      module,
      action,
      allowed: true
    };
  });

  const profile: Profile = {
    id: supabaseProfile.id,
    name: supabaseProfile.name,
    description: supabaseProfile.description,
    permissions,
    isDefault: supabaseProfile.is_default,
    createdAt: supabaseProfile.created_at
  };

  return { user, profile };
};

// Authentication functions
export const authenticateUser = async (username: string, password: string): Promise<{ user: User | null; profile: Profile | null }> => {
  if (!isSupabaseConfigured()) {
    console.log('⚠️ Supabase não configurado, usando autenticação local');
    throw new Error('Supabase not configured');
  }

  try {
    console.log('🔐 Tentando autenticar usuário:', username);
    
    // Find user by username or email with profile data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        profiles (*)
      `)
      .or(`username.eq.${username},email.eq.${username}`)
      .eq('password_hash', password) // In production, use proper password hashing
      .eq('is_active', true)
      .single();

    if (userError || !userData) {
      console.log('❌ Usuário não encontrado ou credenciais inválidas');
      return { user: null, profile: null };
    }

    // Check if email is verified
    if (!userData.is_email_verified) {
      console.log('❌ Email não verificado');
      return { user: null, profile: null };
    }

    console.log('✅ Usuário autenticado:', userData.username);

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userData.id);

    // Convert to local types
    const { user, profile } = convertSupabaseUserToLocal(userData, userData.profiles);

    return { user, profile };
  } catch (error) {
    console.error('💥 Erro na autenticação Supabase:', error);
    throw error;
  }
};

// User management functions
export const getUsers = async (): Promise<SupabaseUser[]> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const createUser = async (userData: {
  username: string;
  email: string;
  password: string;
  profileId: string;
  isActive?: boolean;
}): Promise<{ success: boolean; user?: SupabaseUser; error?: string }> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  try {
    // If no profile ID is provided, get the default profile
    let profileId = userData.profileId;
    
    if (!profileId) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_default', true)
        .limit(1);
        
      if (profileError) {
        return { success: false, error: 'Erro ao obter perfil padrão: ' + profileError.message };
      }
      
      if (!profiles || profiles.length === 0) {
        return { success: false, error: 'Nenhum perfil padrão encontrado' };
      }
      
      profileId = profiles[0].id;
    }
    
    // Check if username already exists
    const { data: existingUsername, error: usernameError } = await supabase
      .from('users')
      .select('id')
      .eq('username', userData.username)
      .limit(1);
      
    if (usernameError) {
      return { success: false, error: 'Erro ao verificar nome de usuário: ' + usernameError.message };
    }
    
    if (existingUsername && existingUsername.length > 0) {
      return { success: false, error: 'Nome de usuário já está em uso' };
    }
    
    // Check if email already exists
    const { data: existingEmail, error: emailError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .limit(1);
      
    if (emailError) {
      return { success: false, error: 'Erro ao verificar email: ' + emailError.message };
    }
    
    if (existingEmail && existingEmail.length > 0) {
      return { success: false, error: 'Email já está em uso' };
    }

    // Generate verification token
    const token = generateVerificationToken();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // Token expires in 24 hours

    const { data, error } = await supabase
      .from('users')
      .insert({
        username: userData.username,
        email: userData.email,
        password_hash: userData.password, // In production, hash this
        profile_id: profileId,
        is_active: userData.isActive ?? true,
        is_email_verified: false,
        email_verification_token: token,
        email_verification_expires: expires.toISOString()
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: data };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: 'Failed to create user' };
  }
};

export const updateUser = async (id: string, updates: any): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  try {
    const updateData: any = {};
    
    if (updates.username) updateData.username = updates.username;
    if (updates.email) updateData.email = updates.email;
    if (updates.password) updateData.password_hash = updates.password;
    if (updates.profileId) updateData.profile_id = updates.profileId;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.isEmailVerified !== undefined) updateData.is_email_verified = updates.isEmailVerified;

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, error: 'Failed to update user' };
  }
};

export const deleteUser = async (id: string): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: 'Failed to delete user' };
  }
};

// Profile management functions
export const getProfiles = async (): Promise<SupabaseProfile[]> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Ensure permissions is always an array
    const processedData = data?.map(profile => {
      // Ensure permissions is an array
      const permissions = Array.isArray(profile.permissions) ? profile.permissions : [];
      
      return {
        ...profile,
        permissions: permissions
      };
    }) || [];
    
    return processedData;
  } catch (error) {
    console.error('Error fetching profiles:', error);
    throw error;
  }
};

export const createProfile = async (profileData: {
  name: string;
  description: string;
  permissions: string[];
  isDefault?: boolean;
}): Promise<{ success: boolean; profile?: SupabaseProfile; error?: string }> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  try {
    // If setting as default, remove default from others
    if (profileData.isDefault) {
      await supabase
        .from('profiles')
        .update({ is_default: false })
        .eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        name: profileData.name,
        description: profileData.description,
        permissions: profileData.permissions,
        is_default: profileData.isDefault ?? false
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, profile: data };
  } catch (error) {
    console.error('Error creating profile:', error);
    return { success: false, error: 'Failed to create profile' };
  }
};

export const updateProfile = async (id: string, updates: any): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  try {
    // If setting as default, remove default from others
    if (updates.isDefault) {
      await supabase
        .from('profiles')
        .update({ is_default: false })
        .eq('is_default', true)
        .neq('id', id);
    }

    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.description) updateData.description = updates.description;
    if (updates.permissions) updateData.permissions = updates.permissions;
    if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: 'Failed to update profile' };
  }
};

export const deleteProfile = async (id: string): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  try {
    // Check if any users are using this profile
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('profile_id', id);

    if (usersError) {
      return { success: false, error: usersError.message };
    }

    if (users && users.length > 0) {
      return { success: false, error: 'Cannot delete profile that is in use by users' };
    }

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting profile:', error);
    return { success: false, error: 'Failed to delete profile' };
  }
};

// Email verification functions
export const verifyEmailToken = async (token: string): Promise<{ success: boolean; message: string }> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  try {
    console.log('🔍 Verificando token:', token.substring(0, 8) + '...');
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email_verification_token', token)
      .single();

    if (error || !user) {
      console.log('❌ Token não encontrado');
      return {
        success: false,
        message: 'Token de verificação inválido ou expirado'
      };
    }

    // Check if token has expired
    if (user.email_verification_expires) {
      const expirationDate = new Date(user.email_verification_expires);
      const now = new Date();

      if (now > expirationDate) {
        console.log('❌ Token expirado');
        return {
          success: false,
          message: 'Token de verificação expirado. Solicite um novo email de verificação.'
        };
      }
    }

    // Verify email
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_email_verified: true,
        email_verification_token: null,
        email_verification_expires: null
      })
      .eq('id', user.id);

    if (updateError) {
      console.log('❌ Erro ao atualizar usuário');
      return {
        success: false,
        message: 'Erro ao verificar email'
      };
    }

    console.log('✅ Email verificado com sucesso');
    return {
      success: true,
      message: 'Email verificado com sucesso! Agora você pode fazer login.'
    };
  } catch (error) {
    console.error('💥 Erro ao verificar email:', error);
    throw error;
  }
};

export const generateVerificationToken = (): string => {
  return Math.random().toString(36).substr(2, 32) + Date.now().toString(36);
};

export const sendVerificationEmailToUser = async (user: SupabaseUser): Promise<{ success: boolean; message: string }> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  try {
    console.log('📧 Preparando envio de email para:', user.email);
    
    const token = generateVerificationToken();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // Token expires in 24 hours

    // Update user with verification token
    const { error } = await supabase
      .from('users')
      .update({
        email_verification_token: token,
        email_verification_expires: expires.toISOString()
      })
      .eq('id', user.id);

    if (error) {
      console.log('❌ Erro ao salvar token');
      return {
        success: false,
        message: 'Erro ao gerar token de verificação'
      };
    }

    // Send email using the existing email service
    const localUser = {
      username: user.username,
      email: user.email
    };

    console.log('📤 Enviando email de verificação...');
    return await sendVerificationEmail(localUser as any, token);
  } catch (error) {
    console.error('💥 Erro ao enviar email de verificação:', error);
    throw error;
  }
};

export const resendVerificationEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  try {
    console.log('🔄 Reenviando email para:', email);
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      console.log('❌ Usuário não encontrado');
      return {
        success: false,
        message: 'Usuário não encontrado com este email'
      };
    }

    if (user.is_email_verified) {
      console.log('ℹ️ Email já verificado');
      return {
        success: false,
        message: 'Este email já foi verificado'
      };
    }

    console.log('📤 Reenviando email...');
    const result = await sendVerificationEmailToUser(user);
    
    if (result.success) {
      return {
        success: true,
        message: 'O e-mail foi reenviado. Favor validar o link'
      };
    }
    
    return result;
  } catch (error) {
    console.error('💥 Erro ao reenviar email:', error);
    throw error;
  }
};