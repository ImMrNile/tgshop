// lib/auth.ts
import { NextApiRequest } from 'next';
import prisma from './prisma';
import type { Prisma, ReferralPayout } from '@prisma/client'; // Удаляем импорт Decimal, так как он не используется
// Обновляем интерфейс для соответствия схеме Prisma
export interface AuthUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

/**
 * Получает информацию о пользователе из заголовка авторизации запроса.
 * Это ключевая функция для проверки, авторизован ли пользователь.
 *
 * @param req Объект NextApiRequest.
 * @returns AuthUser если пользователь аутентифицирован, иначе null.
 */
export async function getUserFromRequest(req: NextApiRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.authorization;

  // Проверяем наличие заголовка и его формат 'Bearer '
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  // Извлекаем telegramId из заголовка (ваш токен = telegramId)
  const telegramId = authHeader.replace('Bearer ', '');

  try {
    // Ищем пользователя в базе данных по telegramId
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
      },
    });

    return user; // Возвращает пользователя или null, если не найден
  } catch (error) {
    console.error('Error fetching user in getUserFromRequest:', error);
    return null; // Возвращаем null в случае ошибки
  }
}

/**
 * Находит существующего пользователя по telegramId или создает нового, если его нет.
 * Также обновляет данные пользователя, если они изменились.
 *
 * @param telegramId Уникальный идентификатор Telegram пользователя.
 * @param userData Дополнительные данные пользователя (username, firstName, lastName).
 * @returns Найденный или созданный объект AuthUser.
 */
export async function getOrCreateUser(telegramId: string, userData?: {
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<AuthUser> {
  try {
    console.log('getOrCreateUser: Attempting to find/create user with telegramId:', telegramId);
    const existingUser = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true, telegramId: true, username: true, firstName: true, lastName: true },
    });

    if (existingUser) {
      console.log('getOrCreateUser: Existing user found:', existingUser.telegramId);
      // Если пользователь существует, проверяем, нужно ли обновить его данные
      if (userData && (
        userData.username !== existingUser.username ||
        userData.firstName !== existingUser.firstName ||
        userData.lastName !== existingUser.lastName
      )) {
        // Обновляем данные пользователя
        const updatedUser = await prisma.user.update({
          where: { telegramId },
          data: {
            username: userData.username !== undefined ? userData.username : existingUser.username,
            firstName: userData.firstName !== undefined ? userData.firstName : existingUser.firstName,
            lastName: userData.lastName !== undefined ? userData.lastName : existingUser.lastName,
          },
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        });
        return updatedUser;
      }
      return existingUser; // Возвращаем существующего пользователя, если данные не требуют обновления
    }

    console.log('getOrCreateUser: User not found, creating new user...');
    const newUser = await prisma.user.create({
      data: {
        telegramId,
        username: userData?.username || null,
        firstName: userData?.firstName || null,
        lastName: userData?.lastName || null,
        // Устанавливаем значения по умолчанию, как определено в вашей схеме Prisma
        referralPercentage: 3.0,
        isKOL: false,
      },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
      },
    });
    console.log('getOrCreateUser: New user created with ID:', newUser.id);
    return newUser; // Возвращаем нового пользователя
  } catch (error: unknown) { // Явное указание типа
    console.error('getOrCreateUser: Database operation failed:', error);
    // Важно выбрасывать ошибку, если создание/получение пользователя не удалось
    throw new Error('Failed to get or create user');
  }
}

/**
 * Генерирует "токен" для пользователя. В вашей текущей реализации токеном является сам telegramId.
 * В более сложных системах здесь мог бы быть JWT.
 *
 * @param user Объект AuthUser.
 * @returns Строковый токен (telegramId).
 */
export function generateToken(user: AuthUser): string {
  return user.telegramId;
}

/**
 * Простая функция валидации токена. В данной реализации просто проверяет,
 * является ли строка непустой.
 *
 * @param token Токен для валидации.
 * @returns true, если токен валиден, иначе false.
 */
export function validateToken(token: string): boolean {
  return typeof token === 'string' && token.length > 0;
}

/**
 * Проверяет, является ли пользователь администратором, сравнивая его telegramId
 * с ADMIN_TELEGRAM_ID из переменных окружения.
 *
 * @param userId ID пользователя из вашей БД.
 * @returns true, если пользователь администратор, иначе false.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true }, // Нам нужен только telegramId для проверки
    });

    if (!user) return false; // Пользователь не найден

    const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
    return user.telegramId === adminTelegramId; // Сравниваем telegramId пользователя с админским
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false; // В случае ошибки считаем, что пользователь не админ
  }
}

/**
 * Middleware-подобная функция для защищенных роутов.
 * Выбрасывает ошибку, если пользователь не аутентифицирован.
 *
 * @param req Объект NextApiRequest.
 * @returns Аутентифицированный объект AuthUser.
 * @throws Error Если аутентификация не пройдена.
 */
export async function requireAuth(req: NextApiRequest): Promise<AuthUser> {
  const user = await getUserFromRequest(req);

  if (!user) {
    throw new Error('Authentication required'); // Выбрасываем ошибку для обработки на верхнем уровне
  }

  return user;
}

/**
 * Middleware-подобная функция для админских роутов.
 * Требует аутентификации и проверяет админские права.
 *
 * @param req Объект NextApiRequest.
 * @returns Аутентифицированный объект AuthUser с правами администратора.
 * @throws Error Если админский доступ не разрешен.
 */
export async function requireAdmin(req: NextApiRequest): Promise<AuthUser> {
  const user = await requireAuth(req); // Сначала проверяем аутентификацию

  const isUserAdmin = await isAdmin(user.id);
  if (!isUserAdmin) {
    throw new Error('Admin access required'); // Выбрасываем ошибку, если не админ
  }

  return user;
}

// ==========================================================
// Дополнительные функции, которые также были в вашем файле lib/auth.ts
// ==========================================================

/**
 * Получает полный профиль пользователя, включая связанные данные.
 * @param userId ID пользователя.
 * @returns Полный профиль пользователя или null.
 */
export async function getUserProfile(userId: string) {
  try {
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            orders: true,
            referredUsers: true,
          },
        },
        referralPayouts: { // ВКЛЮЧАЕМ referralPayouts для доступа к ним
          select: {
            amount: true,
          },
        },
      },
    });

    if (!profile) return null;

    // Вычисляем общий заработок от рефералов
    // Используем импортированный тип ReferralPayout напрямую
    const totalReferralEarnings = (profile.referralPayouts as ReferralPayout[]).reduce( 
      (sum: number, payout: ReferralPayout) => sum + parseFloat(payout.amount.toString()), 
      0
    );

    // Возвращаем профиль с вычисленным заработком
    return {
      ...profile,
      totalReferralEarnings,
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Обновляет данные профиля пользователя.
 * @param userId ID пользователя.
 * @param updateData Объект с данными для обновления.
 * @returns Обновленный объект AuthUser.
 * @throws Error Если обновление не удалось.
 */
export async function updateUserProfile(userId: string, updateData: {
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
      },
    });

    return updatedUser;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Failed to update profile');
  }
}

/**
 * Удаляет пользователя и связанные с ним данные (в соответствии с GDPR).
 * Переносит заказы на "удаленного пользователя".
 * @param userId ID пользователя для удаления.
 * @returns true, если удаление успешно, иначе false.
 */
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => { // Явное указание типа tx как Prisma.TransactionClient
      // Удаляем связанные данные
      await tx.deliveryDetail.deleteMany({ where: { userId } });
      await tx.review.deleteMany({ where: { userId } });
      await tx.referralPayout.deleteMany({ where: { userId } });

      // Убеждаемся, что есть специальный пользователь для "удаленных" аккаунтов
      await tx.user.upsert({
        where: { telegramId: 'deleted-user' },
        update: {},
        create: {
          telegramId: 'deleted-user',
          firstName: 'Deleted',
          lastName: 'User',
          username: null,
        },
      });

      const deletedUser = await tx.user.findUnique({
        where: { telegramId: 'deleted-user' },
        select: { id: true },
      });

      // Переназначаем заказы на "удаленного пользователя", если он существует
      if (deletedUser) {
        await tx.order.updateMany({
          where: { userId },
          data: { userId: deletedUser.id },
        });
      }

      // Удаляем самого пользователя
      await tx.user.delete({ where: { id: userId } });
    });

    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
}

/**
 * Утилита для безопасного парсинга telegramId (из строки или числа).
 * @param value Входное значение.
 * @returns Строка telegramId или null.
 */
export function parseTelegramId(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return null;
}

/**
 * Логирует действия пользователя. (Пример простой реализации)
 * @param userId ID пользователя.
 * @param action Описание действия.
 * @param metadata Дополнительные метаданные.
 */
export async function logUserAction(userId: string, action: string, metadata?: Record<string, unknown>) {
  try {
    console.log(`User action: ${userId} - ${action}`, metadata);
  } catch (error) {
    console.error('Error logging user action:', error);
  }
}

// Константы для ролей пользователей
export const USER_ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  KOL: 'KOL', // Key Opinion Leader - для рефералов
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/**
 * Определяет роль пользователя (Admin, KOL, User).
 * @param userId ID пользователя.
 * @returns Роль пользователя.
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        telegramId: true,
        isKOL: true,
      },
    });

    if (!user) return USER_ROLES.USER; // Если пользователь не найден, считаем обычным пользователем

    // Проверка на админа (сравнение telegramId с переменной окружения)
    if (user.telegramId === process.env.ADMIN_TELEGRAM_ID) {
      return USER_ROLES.ADMIN;
    }

    // Проверка на KOL
    if (user.isKOL) {
      return USER_ROLES.KOL;
    }

    return USER_ROLES.USER; // По умолчанию - обычный пользователь
  } catch (error) {
    console.error('Error getting user role:', error);
    return USER_ROLES.USER; // В случае ошибки - обычный пользователь
  }
}

/**
 * Возвращает отображаемое имя пользователя (ФИО, username или ID).
 * @param user Объект AuthUser.
 * @returns Отображаемое имя.
 */
export function getDisplayName(user: AuthUser): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) {
    return user.firstName;
  }
  if (user.username) {
    return user.username;
  }
  return `User ${user.telegramId}`;
}

/**
 * Проверяет, заполнен ли основной профиль пользователя (ФИО).
 * @param user Объект AuthUser.
 * @returns true, если профиль заполнен, иначе false.
 */
export function isProfileComplete(user: AuthUser): boolean {
  return !!(user.firstName && user.lastName);
}
