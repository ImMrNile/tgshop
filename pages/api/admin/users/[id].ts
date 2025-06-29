// pages/api/admin/users/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { referralPercentage, personalDiscount } = req.body;

      const dataToUpdate: { referralPercentage?: number; personalDiscount?: number | null } = {};

      if (referralPercentage !== undefined) {
        dataToUpdate.referralPercentage = parseFloat(referralPercentage);
      }
      if (personalDiscount !== undefined) {
        dataToUpdate.personalDiscount = personalDiscount ? parseFloat(personalDiscount) : null;
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: dataToUpdate,
      });
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error(`Ошибка при обновлении пользователя ${id}:`, error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}